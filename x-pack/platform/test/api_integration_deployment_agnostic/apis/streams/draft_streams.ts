/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { getEsqlViewName, Streams, emptyAssets } from '@kbn/streams-schema';
import {
  OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS,
  OBSERVABILITY_STREAMS_ENABLE_DRAFT_STREAMS,
} from '@kbn/management-settings-ids';
import type { Client } from '@elastic/elasticsearch';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import {
  componentTemplateExists,
  dataStreamExists,
  deleteStream,
  enableStreams,
  esqlViewExists,
  executeEsql,
  forkStream,
  getEsqlView,
  getStream,
  indexDocument,
  indexTemplateExists,
  ingestPipelineExists,
  putStream,
} from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const kibanaServer = getService('kibanaServer');
  const esClient = getService('es') as unknown as Client;

  let apiClient: StreamsSupertestRepositoryClient;

  const ROOT = 'logs.otel';
  const PARENT = `${ROOT}.draft-parent`;
  const DRAFT_CHILD = `${PARENT}.draft-child`;

  describe('Draft Streams', function () {
    this.tags(['skipCloud', 'skipMKI', 'skipServerless']); // Whilst the views APIs aren't available

    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);

      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS]: true,
        [OBSERVABILITY_STREAMS_ENABLE_DRAFT_STREAMS]: true,
      });

      // Create a parent wired stream to fork drafts from
      await forkStream(apiClient, ROOT, {
        stream: { name: PARENT },
        where: { field: 'attributes.test.draft', eq: 'true' },
      });
    });

    after(async () => {
      await deleteStream(apiClient, PARENT).catch(() => {});
      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS]: false,
        [OBSERVABILITY_STREAMS_ENABLE_DRAFT_STREAMS]: false,
      });
    });

    describe('Forking as draft', () => {
      after(async () => {
        await deleteStream(apiClient, DRAFT_CHILD).catch(() => {});
      });

      it('creates a draft stream via fork', async () => {
        const response = await forkStream(apiClient, PARENT, {
          stream: { name: DRAFT_CHILD },
          where: { field: 'attributes.service.name', eq: 'nginx' },
          draft: true,
        });
        expect(response).to.have.property('acknowledged', true);
      });

      it('returns draft: true in the GET response', async () => {
        const stream = Streams.WiredStream.GetResponse.parse(
          await getStream(apiClient, DRAFT_CHILD)
        );
        expect(stream.stream.ingest.wired.draft).to.eql(true);
      });

      it('creates an ES|QL view with FROM parent view and WHERE clause', async () => {
        const viewName = getEsqlViewName(DRAFT_CHILD);
        const view = await getEsqlView(esClient, viewName);

        expect(view.name).to.eql(viewName);
        expect(view.query).to.contain(`FROM ${getEsqlViewName(PARENT)}`);
        expect(view.query).to.contain('WHERE');
        expect(view.query).to.contain('"nginx"');
      });

      it('does NOT create a data stream for the draft', async () => {
        expect(await dataStreamExists(esClient, DRAFT_CHILD)).to.eql(false);
      });

      it('does NOT create a component template for the draft', async () => {
        expect(await componentTemplateExists(esClient, `${DRAFT_CHILD}@stream.layer`)).to.eql(
          false
        );
      });

      it('does NOT create an index template for the draft', async () => {
        expect(await indexTemplateExists(esClient, `${DRAFT_CHILD}@stream`)).to.eql(false);
      });

      it('does NOT create ingest pipelines for the draft', async () => {
        expect(await ingestPipelineExists(esClient, `${DRAFT_CHILD}@stream.processing`)).to.eql(
          false
        );
        expect(await ingestPipelineExists(esClient, `${DRAFT_CHILD}@stream.reroutes`)).to.eql(
          false
        );
      });

      it('parent ES|QL view does NOT reference the draft child', async () => {
        const parentView = await getEsqlView(esClient, getEsqlViewName(PARENT));
        expect(parentView.query).to.not.contain(getEsqlViewName(DRAFT_CHILD));
        expect(parentView.query).to.not.contain(DRAFT_CHILD);
      });

      it('parent reroute pipeline does NOT include a processor for the draft child', async () => {
        const pipeline = await esClient.ingest.getPipeline({
          id: `${PARENT}@stream.reroutes`,
        });
        const processors = pipeline[`${PARENT}@stream.reroutes`].processors ?? [];
        const destinations = processors
          .filter((p) => p && 'reroute' in p)
          .map((p) => p!.reroute!.destination);
        expect(destinations).to.not.contain(DRAFT_CHILD);
      });

      it('documents are NOT routed to the draft stream', async () => {
        await indexDocument(esClient, ROOT, {
          '@timestamp': new Date().toISOString(),
          message: JSON.stringify({
            '@timestamp': new Date().toISOString(),
            message: 'should not reach draft',
            'test.draft': 'true',
            'service.name': 'nginx',
          }),
        });

        // Draft has no data stream, so the document stays in the parent
        expect(await dataStreamExists(esClient, DRAFT_CHILD)).to.eql(false);
      });
    });

    describe('Draft stream updates', () => {
      before(async () => {
        await forkStream(apiClient, PARENT, {
          stream: { name: DRAFT_CHILD },
          where: { field: 'attributes.service.name', eq: 'nginx' },
          draft: true,
        });
      });

      after(async () => {
        await deleteStream(apiClient, DRAFT_CHILD).catch(() => {});
      });

      it('regenerates the ES|QL view when the draft definition is updated', async () => {
        const viewBefore = await getEsqlView(esClient, getEsqlViewName(DRAFT_CHILD));
        expect(viewBefore.query).to.not.contain('RENAME');

        // Update the draft to add a processing step
        const streamDef = Streams.WiredStream.GetResponse.parse(
          await getStream(apiClient, DRAFT_CHILD)
        );
        const { updated_at: _, ...processing } = streamDef.stream.ingest.processing;
        await putStream(apiClient, DRAFT_CHILD, {
          ...emptyAssets,
          stream: {
            type: streamDef.stream.type,
            description: streamDef.stream.description,
            ingest: {
              ...streamDef.stream.ingest,
              processing: {
                ...processing,
                steps: [
                  {
                    action: 'rename',
                    from: 'attributes.old_field',
                    to: 'attributes.new_field',
                  },
                ],
              },
            },
          },
        });

        const viewAfter = await getEsqlView(esClient, getEsqlViewName(DRAFT_CHILD));
        expect(viewAfter.query).to.contain('attributes.new_field');
      });

      it('still has no ES resources after update', async () => {
        expect(await dataStreamExists(esClient, DRAFT_CHILD)).to.eql(false);
        expect(await componentTemplateExists(esClient, `${DRAFT_CHILD}@stream.layer`)).to.eql(
          false
        );
      });

      it('regenerates the draft WHERE clause when the parent routing condition changes', async () => {
        const viewBefore = await getEsqlView(esClient, getEsqlViewName(DRAFT_CHILD));
        expect(viewBefore.query).to.contain('"nginx"');

        // Update the parent's routing condition for the draft child
        const parentDef = Streams.WiredStream.GetResponse.parse(await getStream(apiClient, PARENT));
        const { updated_at: _, ...processing } = parentDef.stream.ingest.processing;
        const updatedRouting = parentDef.stream.ingest.wired.routing.map((r) => {
          if (r.destination === DRAFT_CHILD) {
            return { ...r, where: { field: 'attributes.service.name', eq: 'apache' } };
          }
          return r;
        });

        await putStream(apiClient, PARENT, {
          ...emptyAssets,
          stream: {
            type: parentDef.stream.type,
            description: parentDef.stream.description,
            ingest: {
              ...parentDef.stream.ingest,
              processing,
              wired: { ...parentDef.stream.ingest.wired, routing: updatedRouting },
            },
          },
        });

        const viewAfter = await getEsqlView(esClient, getEsqlViewName(DRAFT_CHILD));
        expect(viewAfter.query).to.contain('"apache"');
        expect(viewAfter.query).to.not.contain('"nginx"');
      });
    });

    describe('End-to-end: querying draft view returns correct data', () => {
      const E2E_DRAFT = `${PARENT}.e2e-draft`;
      const MATCHING_TARGET = 'draft-match';
      const OTHER_TARGET = 'draft-other';
      const SET_UNMAPPED = 'SET unmapped_fields="LOAD";\n';

      before(async () => {
        // Top-level fields are normalized by the `normalize_for_stream` processor:
        //   `message`     → `body.text`
        //   `test.draft`  → `attributes.test.draft`  (matches ROOT→PARENT routing)
        //   `test.target` → `attributes.test.target`  (used for draft routing)
        await indexDocument(esClient, ROOT, {
          '@timestamp': new Date().toISOString(),
          message: 'doc-alpha',
          ['test.draft']: 'true',
          ['test.target']: MATCHING_TARGET,
        });
        await indexDocument(esClient, ROOT, {
          '@timestamp': new Date().toISOString(),
          message: 'doc-beta',
          ['test.draft']: 'true',
          ['test.target']: MATCHING_TARGET,
        });
        await indexDocument(esClient, ROOT, {
          '@timestamp': new Date().toISOString(),
          message: 'doc-gamma',
          ['test.draft']: 'true',
          ['test.target']: OTHER_TARGET,
        });

        await forkStream(apiClient, PARENT, {
          stream: { name: E2E_DRAFT },
          where: { field: 'attributes.test.target', eq: MATCHING_TARGET },
          draft: true,
        });
      });

      after(async () => {
        await deleteStream(apiClient, E2E_DRAFT).catch(() => {});
      });

      it('returns only documents matching the draft routing condition', async () => {
        const viewName = getEsqlViewName(E2E_DRAFT);
        const result = await executeEsql(
          esClient,
          `${SET_UNMAPPED}FROM ${viewName} | KEEP \`body.text\`, \`attributes.test.target\` | SORT \`body.text\``
        );

        const bodyCol = result.columns.findIndex((c) => c.name === 'body.text');
        const targetCol = result.columns.findIndex((c) => c.name === 'attributes.test.target');

        expect(result.values.length).to.eql(2);
        expect(result.values[0][bodyCol]).to.eql('doc-alpha');
        expect(result.values[1][bodyCol]).to.eql('doc-beta');
        result.values.forEach((row) => {
          expect(row[targetCol]).to.eql(MATCHING_TARGET);
        });
      });

      it('updates the view results when the routing condition changes', async () => {
        const parentDef = Streams.WiredStream.GetResponse.parse(await getStream(apiClient, PARENT));
        const { updated_at: _, ...processing } = parentDef.stream.ingest.processing;
        const updatedRouting = parentDef.stream.ingest.wired.routing.map((r) => {
          if (r.destination === E2E_DRAFT) {
            return { ...r, where: { field: 'attributes.test.target', eq: OTHER_TARGET } };
          }
          return r;
        });

        await putStream(apiClient, PARENT, {
          ...emptyAssets,
          stream: {
            type: parentDef.stream.type,
            description: parentDef.stream.description,
            ingest: {
              ...parentDef.stream.ingest,
              processing,
              wired: { ...parentDef.stream.ingest.wired, routing: updatedRouting },
            },
          },
        });

        const viewName = getEsqlViewName(E2E_DRAFT);
        const result = await executeEsql(
          esClient,
          `${SET_UNMAPPED}FROM ${viewName} | KEEP \`body.text\`, \`attributes.test.target\` | SORT \`body.text\``
        );

        expect(result.values.length).to.eql(1);
        const bodyCol = result.columns.findIndex((c) => c.name === 'body.text');
        const targetCol = result.columns.findIndex((c) => c.name === 'attributes.test.target');
        expect(result.values[0][bodyCol]).to.eql('doc-gamma');
        expect(result.values[0][targetCol]).to.eql(OTHER_TARGET);
      });

      it('reflects processing steps in query results', async () => {
        const streamDef = Streams.WiredStream.GetResponse.parse(
          await getStream(apiClient, E2E_DRAFT)
        );
        const { updated_at: _, ...processing } = streamDef.stream.ingest.processing;
        await putStream(apiClient, E2E_DRAFT, {
          ...emptyAssets,
          stream: {
            type: streamDef.stream.type,
            description: streamDef.stream.description,
            ingest: {
              ...streamDef.stream.ingest,
              processing: {
                ...processing,
                steps: [{ action: 'set', to: 'attributes.enriched', value: 'from-draft' }],
              },
            },
          },
        });

        const viewName = getEsqlViewName(E2E_DRAFT);
        const result = await executeEsql(
          esClient,
          `${SET_UNMAPPED}FROM ${viewName} | KEEP \`body.text\`, \`attributes.enriched\` | SORT \`body.text\``
        );

        const bodyCol = result.columns.findIndex((c) => c.name === 'body.text');
        const enrichedCol = result.columns.findIndex((c) => c.name === 'attributes.enriched');

        expect(result.values.length).to.eql(1);
        expect(result.values[0][bodyCol]).to.eql('doc-gamma');
        expect(result.values[0][enrichedCol]).to.eql('from-draft');
      });
    });

    describe('Materialization (draft to non-draft)', () => {
      before(async () => {
        // Fork a draft child
        await forkStream(apiClient, PARENT, {
          stream: { name: DRAFT_CHILD },
          where: { field: 'attributes.service.name', eq: 'nginx' },
          draft: true,
        });
      });

      after(async () => {
        await deleteStream(apiClient, DRAFT_CHILD).catch(() => {});
      });

      it('materializes: creates data stream and all ES resources', async () => {
        // Confirm draft state
        expect(await dataStreamExists(esClient, DRAFT_CHILD)).to.eql(false);

        // Materialize by setting draft to false
        const streamDef = Streams.WiredStream.GetResponse.parse(
          await getStream(apiClient, DRAFT_CHILD)
        );
        const { updated_at: _, ...processing } = streamDef.stream.ingest.processing;
        await putStream(apiClient, DRAFT_CHILD, {
          ...emptyAssets,
          stream: {
            type: streamDef.stream.type,
            description: streamDef.stream.description,
            ingest: {
              ...streamDef.stream.ingest,
              processing,
              wired: { ...streamDef.stream.ingest.wired, draft: false },
            },
          },
        });

        const updated = Streams.WiredStream.GetResponse.parse(
          await getStream(apiClient, DRAFT_CHILD)
        );
        expect(updated.stream.ingest.wired.draft).to.not.eql(true);

        expect(await dataStreamExists(esClient, DRAFT_CHILD)).to.eql(true);
        expect(await componentTemplateExists(esClient, `${DRAFT_CHILD}@stream.layer`)).to.eql(true);
        expect(await indexTemplateExists(esClient, `${DRAFT_CHILD}@stream`)).to.eql(true);
        expect(await ingestPipelineExists(esClient, `${DRAFT_CHILD}@stream.processing`)).to.eql(
          true
        );
        expect(await ingestPipelineExists(esClient, `${DRAFT_CHILD}@stream.reroutes`)).to.eql(true);
      });

      it('parent ES|QL view is updated to include the now-materialized child', async () => {
        const parentView = await getEsqlView(esClient, getEsqlViewName(PARENT));
        expect(parentView.query).to.contain(getEsqlViewName(DRAFT_CHILD));
      });

      it('parent reroute pipeline now includes the materialized child', async () => {
        const pipeline = await esClient.ingest.getPipeline({
          id: `${PARENT}@stream.reroutes`,
        });
        const processors = pipeline[`${PARENT}@stream.reroutes`].processors ?? [];
        const destinations = processors
          .filter((p) => p && 'reroute' in p)
          .map((p) => p!.reroute!.destination);
        expect(destinations).to.contain(DRAFT_CHILD);
      });

      it('cannot revert a materialized stream back to draft', async () => {
        const streamDef = Streams.WiredStream.GetResponse.parse(
          await getStream(apiClient, DRAFT_CHILD)
        );
        const { updated_at: _, ...processing } = streamDef.stream.ingest.processing;
        const response = (await putStream(
          apiClient,
          DRAFT_CHILD,
          {
            ...emptyAssets,
            stream: {
              type: streamDef.stream.type,
              description: streamDef.stream.description,
              ingest: {
                ...streamDef.stream.ingest,
                processing,
                wired: { ...streamDef.stream.ingest.wired, draft: true },
              },
            },
          },
          400
        )) as unknown as { message: string };

        expect(response.message).to.contain('Cannot revert a materialized stream to draft');
      });
    });

    describe('Validation: routing order', () => {
      const DRAFT_A = `${PARENT}.draft-a`;
      const MAT_AFTER = `${PARENT}.mat-after`;

      before(async () => {
        // Create a draft child first
        await forkStream(apiClient, PARENT, {
          stream: { name: DRAFT_A },
          where: { field: 'attributes.service.name', eq: 'a' },
          draft: true,
        });
      });

      after(async () => {
        await deleteStream(apiClient, MAT_AFTER).catch(() => {});
        await deleteStream(apiClient, DRAFT_A).catch(() => {});
      });

      it('rejects forking a materialized child after a draft in the routing list', async () => {
        const response = await forkStream(
          apiClient,
          PARENT,
          {
            stream: { name: MAT_AFTER },
            where: { field: 'attributes.service.name', eq: 'after' },
          },
          400
        );

        expect((response as unknown as { message: string }).message).to.contain(
          'cannot appear after a draft stream'
        );
      });
    });

    describe('Validation: draft parent with materialized children', () => {
      const DRAFT_PARENT = `${ROOT}.draft-parent-val`;
      const MAT_GRANDCHILD = `${DRAFT_PARENT}.mat-grandchild`;

      before(async () => {
        await forkStream(apiClient, ROOT, {
          stream: { name: DRAFT_PARENT },
          where: { field: 'attributes.draft.parent', eq: 'true' },
          draft: true,
        });
      });

      after(async () => {
        await deleteStream(apiClient, MAT_GRANDCHILD).catch(() => {});
        await deleteStream(apiClient, DRAFT_PARENT).catch(() => {});
      });

      it('rejects adding a materialized child to a draft parent', async () => {
        const response = await forkStream(
          apiClient,
          DRAFT_PARENT,
          {
            stream: { name: MAT_GRANDCHILD },
            where: { field: 'attributes.service.name', eq: 'test' },
          },
          400
        );

        expect((response as unknown as { message: string }).message).to.contain('Draft stream');
        expect((response as unknown as { message: string }).message).to.contain(
          'cannot have materialized child'
        );
      });

      it('allows adding a draft child to a draft parent', async () => {
        const draftGrandchild = `${DRAFT_PARENT}.draft-grandchild`;
        const response = await forkStream(apiClient, DRAFT_PARENT, {
          stream: { name: draftGrandchild },
          where: { field: 'attributes.service.name', eq: 'test' },
          draft: true,
        });

        expect(response).to.have.property('acknowledged', true);

        await deleteStream(apiClient, draftGrandchild).catch(() => {});
      });
    });

    describe('Deleting a draft stream', () => {
      const DRAFT_TO_DELETE = `${PARENT}.draft-del`;

      before(async () => {
        await forkStream(apiClient, PARENT, {
          stream: { name: DRAFT_TO_DELETE },
          where: { field: 'attributes.service.name', eq: 'delete-me' },
          draft: true,
        });
      });

      it('draft is retrievable before deletion', async () => {
        const stream = await getStream(apiClient, DRAFT_TO_DELETE);
        expect(stream).to.have.property('stream');
      });

      it('draft ES|QL view exists before deletion', async () => {
        expect(await esqlViewExists(esClient, getEsqlViewName(DRAFT_TO_DELETE))).to.eql(true);
      });

      it('deletes the draft stream successfully', async () => {
        const response = await deleteStream(apiClient, DRAFT_TO_DELETE);
        expect(response).to.have.property('acknowledged', true);
      });

      it('draft stream no longer exists', async () => {
        await getStream(apiClient, DRAFT_TO_DELETE, 404);
      });

      it('draft ES|QL view is removed', async () => {
        expect(await esqlViewExists(esClient, getEsqlViewName(DRAFT_TO_DELETE))).to.eql(false);
      });

      it('parent routing no longer references the deleted draft', async () => {
        const parentDef = Streams.WiredStream.GetResponse.parse(await getStream(apiClient, PARENT));
        const destinations = parentDef.stream.ingest.wired.routing.map((r) => r.destination);
        expect(destinations).to.not.contain(DRAFT_TO_DELETE);
      });
    });

    describe('Mixed draft and materialized children', () => {
      const MAT_FIRST = `${PARENT}.mat-first`;
      const DRAFT_AFTER_MAT = `${PARENT}.draft-after-mat`;

      before(async () => {
        // Ensure a clean parent with no children from previous tests
        const parentDef = Streams.WiredStream.GetResponse.parse(await getStream(apiClient, PARENT));
        const { updated_at: _, ...processing } = parentDef.stream.ingest.processing;
        await putStream(apiClient, PARENT, {
          ...emptyAssets,
          stream: {
            type: parentDef.stream.type,
            description: parentDef.stream.description,
            ingest: {
              ...parentDef.stream.ingest,
              processing,
              wired: { ...parentDef.stream.ingest.wired, routing: [] },
            },
          },
        });
      });

      after(async () => {
        await deleteStream(apiClient, DRAFT_AFTER_MAT).catch(() => {});
        await deleteStream(apiClient, MAT_FIRST).catch(() => {});
      });

      it('allows materialized child first, then draft child', async () => {
        // Fork a normal (materialized) child first
        const matResponse = await forkStream(apiClient, PARENT, {
          stream: { name: MAT_FIRST },
          where: { field: 'attributes.service.name', eq: 'first' },
        });
        expect(matResponse).to.have.property('acknowledged', true);

        // Fork a draft child after the materialized one — this is valid
        const draftResponse = await forkStream(apiClient, PARENT, {
          stream: { name: DRAFT_AFTER_MAT },
          where: { field: 'attributes.service.name', eq: 'second' },
          draft: true,
        });
        expect(draftResponse).to.have.property('acknowledged', true);
      });

      it('parent reroute pipeline includes only the materialized child', async () => {
        const pipeline = await esClient.ingest.getPipeline({
          id: `${PARENT}@stream.reroutes`,
        });
        const processors = pipeline[`${PARENT}@stream.reroutes`].processors ?? [];
        const destinations = processors
          .filter((p) => p && 'reroute' in p)
          .map((p) => p!.reroute!.destination);

        expect(destinations).to.contain(MAT_FIRST);
        expect(destinations).to.not.contain(DRAFT_AFTER_MAT);
      });

      it('parent ES|QL view includes only the materialized child', async () => {
        const parentView = await getEsqlView(esClient, getEsqlViewName(PARENT));
        expect(parentView.query).to.contain(getEsqlViewName(MAT_FIRST));
        expect(parentView.query).to.not.contain(getEsqlViewName(DRAFT_AFTER_MAT));
      });
    });

    describe('Draft with processing steps', () => {
      const DRAFT_WITH_PROC = `${PARENT}.draft-proc`;

      before(async () => {
        // Clean parent routing
        const parentDef = Streams.WiredStream.GetResponse.parse(await getStream(apiClient, PARENT));
        const { updated_at: _, ...processing } = parentDef.stream.ingest.processing;
        await putStream(apiClient, PARENT, {
          ...emptyAssets,
          stream: {
            type: parentDef.stream.type,
            description: parentDef.stream.description,
            ingest: {
              ...parentDef.stream.ingest,
              processing,
              wired: { ...parentDef.stream.ingest.wired, routing: [] },
            },
          },
        });
      });

      after(async () => {
        await deleteStream(apiClient, DRAFT_WITH_PROC).catch(() => {});
      });

      it('creates a draft with processing steps reflected in the ES|QL view', async () => {
        await forkStream(apiClient, PARENT, {
          stream: { name: DRAFT_WITH_PROC },
          where: { field: 'attributes.service.name', eq: 'proc-test' },
          draft: true,
        });

        // Add processing steps to the draft
        const streamDef = Streams.WiredStream.GetResponse.parse(
          await getStream(apiClient, DRAFT_WITH_PROC)
        );
        const { updated_at: _, ...processing } = streamDef.stream.ingest.processing;
        await putStream(apiClient, DRAFT_WITH_PROC, {
          ...emptyAssets,
          stream: {
            type: streamDef.stream.type,
            description: streamDef.stream.description,
            ingest: {
              ...streamDef.stream.ingest,
              processing: {
                ...processing,
                steps: [
                  {
                    action: 'rename',
                    from: 'attributes.old_name',
                    to: 'attributes.new_name',
                  },
                ],
              },
            },
          },
        });

        const view = await getEsqlView(esClient, getEsqlViewName(DRAFT_WITH_PROC));
        expect(view.query).to.contain(`FROM ${getEsqlViewName(PARENT)}`);
        expect(view.query).to.contain('WHERE');
        expect(view.query).to.contain('attributes.new_name');
      });
    });

    describe('Creating draft via PUT (routing with draft: true)', () => {
      const DRAFT_VIA_PUT = `${PARENT}.draft-via-put`;

      before(async () => {
        // Clean parent routing
        const parentDef = Streams.WiredStream.GetResponse.parse(await getStream(apiClient, PARENT));
        const { updated_at: _, ...processing } = parentDef.stream.ingest.processing;
        await putStream(apiClient, PARENT, {
          ...emptyAssets,
          stream: {
            type: parentDef.stream.type,
            description: parentDef.stream.description,
            ingest: {
              ...parentDef.stream.ingest,
              processing,
              wired: {
                ...parentDef.stream.ingest.wired,
                routing: [
                  {
                    destination: DRAFT_VIA_PUT,
                    where: { field: 'attributes.service.name', eq: 'put-draft' },
                    draft: true,
                  },
                ],
              },
            },
          },
        });
      });

      after(async () => {
        await deleteStream(apiClient, DRAFT_VIA_PUT).catch(() => {});
      });

      it('creates a draft child with draft: true in the definition', async () => {
        const stream = Streams.WiredStream.GetResponse.parse(
          await getStream(apiClient, DRAFT_VIA_PUT)
        );
        expect(stream.stream.ingest.wired.draft).to.eql(true);
      });

      it('creates an ES|QL view for the draft', async () => {
        const view = await getEsqlView(esClient, getEsqlViewName(DRAFT_VIA_PUT));
        expect(view.query).to.contain(`FROM ${getEsqlViewName(PARENT)}`);
        expect(view.query).to.contain('"put-draft"');
      });

      it('does NOT create ES resources for the draft', async () => {
        expect(await dataStreamExists(esClient, DRAFT_VIA_PUT)).to.eql(false);
        expect(await componentTemplateExists(esClient, `${DRAFT_VIA_PUT}@stream.layer`)).to.eql(
          false
        );
        expect(await indexTemplateExists(esClient, `${DRAFT_VIA_PUT}@stream`)).to.eql(false);
        expect(await ingestPipelineExists(esClient, `${DRAFT_VIA_PUT}@stream.processing`)).to.eql(
          false
        );
      });

      it('parent reroute pipeline does NOT include the draft child', async () => {
        const pipeline = await esClient.ingest.getPipeline({
          id: `${PARENT}@stream.reroutes`,
        });
        const processors = pipeline[`${PARENT}@stream.reroutes`].processors ?? [];
        const destinations = processors
          .filter((p) => p && 'reroute' in p)
          .map((p) => p!.reroute!.destination);
        expect(destinations).to.not.contain(DRAFT_VIA_PUT);
      });
    });

    describe('Draft with always condition', () => {
      const DRAFT_ALWAYS = `${PARENT}.draft-always`;

      before(async () => {
        // Clean parent routing
        const parentDef = Streams.WiredStream.GetResponse.parse(await getStream(apiClient, PARENT));
        const { updated_at: _, ...processing } = parentDef.stream.ingest.processing;
        await putStream(apiClient, PARENT, {
          ...emptyAssets,
          stream: {
            type: parentDef.stream.type,
            description: parentDef.stream.description,
            ingest: {
              ...parentDef.stream.ingest,
              processing,
              wired: { ...parentDef.stream.ingest.wired, routing: [] },
            },
          },
        });
      });

      after(async () => {
        await deleteStream(apiClient, DRAFT_ALWAYS).catch(() => {});
      });

      it('creates a draft with always condition (no WHERE clause)', async () => {
        await forkStream(apiClient, PARENT, {
          stream: { name: DRAFT_ALWAYS },
          where: { always: {} },
          draft: true,
        });

        const view = await getEsqlView(esClient, getEsqlViewName(DRAFT_ALWAYS));
        expect(view.query).to.contain(`FROM ${getEsqlViewName(PARENT)}`);
        expect(view.query).to.not.contain('WHERE');
      });
    });
  });
}
