/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { IngestStreamLifecycle, Streams } from '@kbn/streams-schema';
import { isDslLifecycle, isIlmLifecycle, emptyAssets } from '@kbn/streams-schema';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { SignificantEventsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import {
  bulkQueries,
  getMaintenanceStatus,
  getQueries,
  pauseMaintenance,
  resumeMaintenance,
} from './helpers/requests';
import { createTestSource, deleteTestSource } from './helpers/test_source';
import {
  deleteStream,
  disableStreams,
  enableStreams,
  putStream,
} from '../streams/helpers/requests';
import type { RoleCredentials } from '../../services';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  const alertingApi = getService('alertingApiCommon');
  const samlAuth = getService('samlAuth');
  let roleAuthc: RoleCredentials;
  let apiClient: SignificantEventsSupertestRepositoryClient;

  describe('Significant Events', function () {
    before(async () => {
      roleAuthc = await samlAuth.createM2mApiKeyWithRoleScope('admin');
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('Wired streams update', () => {
      const STREAM_NAME = 'logs.otel.queries-test';
      const stream: Streams.WiredStream.UpsertRequest['stream'] = {
        type: 'wired',
        description: '',
        ingest: {
          lifecycle: { inherit: {} },
          processing: { steps: [] },
          settings: {},
          wired: {
            routing: [],
            fields: {},
          },
          failure_store: { inherit: {} },
        },
      };

      beforeEach(async () => {
        await putStream(apiClient, STREAM_NAME, {
          stream,
          ...emptyAssets,
        }).then((response) => expect(response).to.have.property('acknowledged', true));
      });

      afterEach(async () => {
        await deleteStream(apiClient, STREAM_NAME);
      });

      it('updates the queries', async () => {
        const source = await createTestSource(
          roleScopedSupertest,
          'Wired query source',
          `FROM ${STREAM_NAME}`
        );
        try {
          const esqlQuery = `FROM ${source.viewName} | WHERE KQL("message: 'OOM Error'")`;
          const response = await bulkQueries(apiClient, source.id, [
            {
              index: {
                id: 'aaa',
                title: 'OOM Error',
                description: '',
                esql: { query: esqlQuery },
              },
            },
          ]);
          expect(response).to.have.property('acknowledged', true);

          const { queries } = await getQueries(apiClient, source.id);
          expect(queries.length).to.eql(1);
          expect(queries[0]).to.eql({
            id: 'aaa',
            type: 'match',
            title: 'OOM Error',
            description: '',
            esql: { query: esqlQuery },
          });
        } finally {
          await deleteTestSource(roleScopedSupertest, source.id);
        }
      });

      it('deletes all queries on stream and its children', async () => {
        let response = await putStream(apiClient, STREAM_NAME, {
          stream: {
            ...stream,
            ingest: {
              ...stream.ingest,
              wired: {
                ...stream.ingest.wired,
                routing: [
                  {
                    destination: 'logs.otel.queries-test.child',
                    where: {
                      always: {},
                    },
                    status: 'enabled',
                  },
                ],
              },
            },
          },
          ...emptyAssets,
        });
        expect(response).to.have.property('acknowledged', true);
        const parentSource = await createTestSource(
          roleScopedSupertest,
          'Wired parent query source',
          `FROM ${STREAM_NAME}`
        );
        const parentQuery = `FROM ${parentSource.viewName} | WHERE KQL("message:\\"irrelevant\\"")`;
        await bulkQueries(apiClient, parentSource.id, [
          {
            index: {
              id: 'logs.otel.queries-test.query1',
              title: 'should not be deleted',
              description: '',
              esql: { query: parentQuery },
            },
          },
        ]);

        response = await putStream(apiClient, 'logs.otel.queries-test.child', {
          stream: {
            ...stream,
            ingest: {
              ...stream.ingest,
              wired: {
                ...stream.ingest.wired,
                routing: [
                  {
                    destination: 'logs.otel.queries-test.child.first',
                    where: {
                      field: 'attributes.field',
                      lt: 15,
                    },
                    status: 'enabled',
                  },
                  {
                    destination: 'logs.otel.queries-test.child.second',
                    where: {
                      field: 'attributes.field',
                      gt: 15,
                    },
                    status: 'enabled',
                  },
                ],
              },
            },
          },
          ...emptyAssets,
        });
        expect(response).to.have.property('acknowledged', true);
        const childSource = await createTestSource(
          roleScopedSupertest,
          'Wired child query source',
          'FROM logs.otel.queries-test.child'
        );
        const childQuery = `FROM ${childSource.viewName} | WHERE KQL("message:\\"irrelevant\\"")`;
        await bulkQueries(apiClient, childSource.id, [
          {
            index: {
              id: 'logs.otel.queries-test.child.query1',
              title: 'must be deleted',
              description: '',
              esql: { query: childQuery },
            },
          },
        ]);

        response = await putStream(apiClient, 'logs.otel.queries-test.child.first', {
          stream,
          ...emptyAssets,
        });
        expect(response).to.have.property('acknowledged', true);
        const grandchildSource = await createTestSource(
          roleScopedSupertest,
          'Wired grandchild query source',
          'FROM logs.otel.queries-test.child.first'
        );
        const grandchildQuery = `FROM ${grandchildSource.viewName} | WHERE KQL("message:\\"irrelevant\\"")`;
        await bulkQueries(apiClient, grandchildSource.id, [
          {
            index: {
              id: 'logs.otel.queries-test.child.first.query1',
              title: 'must be deleted',
              description: '',
              esql: { query: grandchildQuery },
            },
          },
          {
            index: {
              id: 'logs.otel.queries-test.child.first.query2',
              title: 'must be deleted',
              description: '',
              esql: { query: grandchildQuery },
            },
          },
        ]);

        await deleteStream(apiClient, 'logs.otel.queries-test.child');

        // Queries are stored under the source id. Deleting the child stream
        // leaves those queries and their rules in place.
        const { queries: parentQueries } = await getQueries(apiClient, parentSource.id);
        expect(parentQueries).to.have.length(1);
        expect(parentQueries[0].id).to.eql('logs.otel.queries-test.query1');

        const { queries: childQueries } = await getQueries(apiClient, childSource.id);
        expect(childQueries).to.have.length(1);
        const { queries: grandchildQueries } = await getQueries(apiClient, grandchildSource.id);
        expect(grandchildQueries).to.have.length(2);

        const rules = await alertingApi.searchRulesV2(roleAuthc, {
          search: 'should not be deleted',
          per_page: 100,
        });
        const parentRules = rules.body.items.filter(
          (item: { metadata: { name: string } }) =>
            item.metadata.name === 'should not be deleted (match count)'
        );
        expect(parentRules).to.have.length(1);

        await deleteTestSource(roleScopedSupertest, parentSource.id);
        await deleteTestSource(roleScopedSupertest, childSource.id);
        await deleteTestSource(roleScopedSupertest, grandchildSource.id);
      });
    });

    describe('Classic streams update', () => {
      const classicPutBody: Streams.ClassicStream.UpsertRequest = {
        stream: {
          type: 'classic',
          description: '',
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [] },
            settings: {},
            classic: {},
            failure_store: { inherit: {} },
          },
        },
        ...emptyAssets,
      };

      const createDataStream = async (name: string, lifecycle: IngestStreamLifecycle) => {
        await esClient.indices.putIndexTemplate({
          name,
          index_patterns: [name],
          data_stream: {},
          template: isDslLifecycle(lifecycle)
            ? {
                lifecycle: { data_retention: lifecycle.dsl.data_retention },
                settings: {
                  'index.lifecycle.prefer_ilm': false,
                  'index.default_pipeline': 'logs@default-pipeline',
                },
              }
            : isIlmLifecycle(lifecycle)
            ? {
                settings: {
                  'index.default_pipeline': 'logs@default-pipeline',
                  'index.lifecycle.prefer_ilm': true,
                  'index.lifecycle.name': lifecycle.ilm.policy,
                },
              }
            : undefined,
        });
        await esClient.indices.createDataStream({ name });

        return async () => {
          await esClient.indices.deleteDataStream({ name });
          await esClient.indices.deleteIndexTemplate({ name });
        };
      };

      it('updates the queries', async () => {
        const indexName = 'classic-stream-queries';
        const clean = await createDataStream(indexName, { dsl: { data_retention: '77d' } });
        await putStream(apiClient, indexName, classicPutBody);
        const source = await createTestSource(
          roleScopedSupertest,
          'Classic query source',
          `FROM ${indexName}`
        );
        const esqlQuery = `FROM ${source.viewName} | WHERE KQL("message: 'OOM Error'")`;

        try {
          const initialQueries = await getQueries(apiClient, source.id);
          expect(initialQueries.queries.length).to.eql(0);

          await bulkQueries(apiClient, source.id, [
            {
              index: {
                id: 'aaa',
                title: 'OOM Error',
                description: '',
                esql: { query: esqlQuery },
              },
            },
          ]);

          const { queries } = await getQueries(apiClient, source.id);
          expect(queries.length).to.eql(1);
          expect(queries[0]).to.eql({
            id: 'aaa',
            type: 'match',
            title: 'OOM Error',
            description: '',
            esql: { query: esqlQuery },
          });
        } finally {
          await deleteTestSource(roleScopedSupertest, source.id);
          await clean();
          await deleteStream(apiClient, indexName);
        }
      });
    });

    describe('Maintenance pause/resume', () => {
      // Pause is deployment-wide, so always leave the deployment resumed for
      // whatever runs next, even if an assertion above fails.
      afterEach(async () => {
        await resumeMaintenance(apiClient);
      });

      it('round-trips the persisted maintenance state and stays idempotent', async () => {
        expect((await getMaintenanceStatus(apiClient)).state).to.eql('enabled');

        const pauseSummary = await pauseMaintenance(apiClient);
        expect(pauseSummary.state).to.eql('paused');
        expect((await getMaintenanceStatus(apiClient)).state).to.eql('paused');

        // Re-pausing re-sweeps: assert the deterministic state/counts, not the live-recomputed partialFailures.
        const rePauseSummary = await pauseMaintenance(apiClient);
        expect(rePauseSummary.state).to.eql('paused');
        expect(rePauseSummary.workflowsDisabled).to.eql(pauseSummary.workflowsDisabled);
        expect(rePauseSummary.rulesDisabled).to.eql(pauseSummary.rulesDisabled);
        expect(rePauseSummary.executionsCancelled).to.eql(pauseSummary.executionsCancelled);

        const resumeSummary = await resumeMaintenance(apiClient);
        expect(resumeSummary.state).to.eql('enabled');
        expect((await getMaintenanceStatus(apiClient)).state).to.eql('enabled');

        // Resuming again while enabled is a no-op.
        expect((await resumeMaintenance(apiClient)).state).to.eql('enabled');
      });
    });
  });
}
