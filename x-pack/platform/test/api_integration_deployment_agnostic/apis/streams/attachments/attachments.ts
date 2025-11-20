/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import {
  disableStreams,
  enableStreams,
  indexDocument,
  putStream,
  deleteStream,
  linkAttachment,
  unlinkAttachment,
  getAttachments,
  bulkAttachments,
  getAttachmentSuggestions,
} from '../helpers/requests';
import type { StreamsSupertestRepositoryClient } from '../helpers/repository_client';
import { createStreamsRepositoryAdminClient } from '../helpers/repository_client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';
import { loadDashboards, unloadDashboards } from '../helpers/dashboards';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');

  let apiClient: StreamsSupertestRepositoryClient;

  const kibanaServer = getService('kibanaServer');

  const SPACE_ID = 'default';
  const DASHBOARD_ARCHIVES = [
    'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/search.json',
    'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json',
    'x-pack/platform/test/api_integration/fixtures/kbn_archives/streams/tagged_dashboard.json',
  ];
  const RULE_ARCHIVE =
    'x-pack/platform/test/api_integration/fixtures/kbn_archives/streams/rules.json';

  const SEARCH_DASHBOARD_ID = 'b70c7ae0-3224-11e8-a572-ffca06da1357';
  const BASIC_DASHBOARD_ID = 'be3733a0-9efe-11e7-acb3-3dab96693fab';
  const BASIC_DASHBOARD_TITLE = 'Requests';
  const TAG_ID = '00ad6a46-6ac3-4f6c-892c-2f72c54a5e7d';
  const FIRST_RULE_ID = '09cef989-3ded-4a1e-b2b0-53d491d13397';
  const SECOND_RULE_ID = '312638da-43d1-4d6e-8fb8-9cae201cdd3a';

  describe('Generic Attachment API', function () {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);

      await indexDocument(esClient, 'logs', {
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
      });
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('List attachments', () => {
      before(async () => {
        await loadDashboards(kibanaServer, DASHBOARD_ARCHIVES, SPACE_ID);
        await kibanaServer.importExport.load(RULE_ARCHIVE, { space: SPACE_ID });

        await linkAttachment(apiClient, 'logs', 'dashboard', SEARCH_DASHBOARD_ID);
        await linkAttachment(apiClient, 'logs', 'rule', FIRST_RULE_ID);
      });

      after(async () => {
        await unlinkAttachment(apiClient, 'logs', 'dashboard', SEARCH_DASHBOARD_ID);
        await unlinkAttachment(apiClient, 'logs', 'rule', FIRST_RULE_ID);
        await unloadDashboards(kibanaServer, DASHBOARD_ARCHIVES, SPACE_ID);
        await kibanaServer.importExport.unload(RULE_ARCHIVE, { space: SPACE_ID });
      });

      it('lists all attachments without type filter', async () => {
        const response = await getAttachments(apiClient, 'logs');

        expect(response.attachments.length).to.eql(2);
        const types = response.attachments.map((a) => a.type).sort();
        expect(types).to.eql(['dashboard', 'rule']);
      });

      it('lists only dashboards when type filter is dashboard', async () => {
        const response = await getAttachments(apiClient, 'logs', 'dashboard');

        expect(response.attachments.length).to.eql(1);
        expect(response.attachments[0].type).to.eql('dashboard');
        expect(response.attachments[0].id).to.eql(SEARCH_DASHBOARD_ID);
      });

      it('lists only rules when type filter is rule', async () => {
        const response = await getAttachments(apiClient, 'logs', 'rule');

        expect(response.attachments.length).to.eql(1);
        expect(response.attachments[0].type).to.eql('rule');
        expect(response.attachments[0].id).to.eql(FIRST_RULE_ID);
      });
    });

    describe('Link and unlink attachments', () => {
      describe('dashboard attachments', () => {
        before(async () => {
          await loadDashboards(kibanaServer, DASHBOARD_ARCHIVES, SPACE_ID);
        });

        after(async () => {
          await unloadDashboards(kibanaServer, DASHBOARD_ARCHIVES, SPACE_ID);
        });

        it('links a dashboard to a stream', async () => {
          const linkResponse = await linkAttachment(
            apiClient,
            'logs',
            'dashboard',
            SEARCH_DASHBOARD_ID
          );
          expect(linkResponse.acknowledged).to.eql(true);

          const listResponse = await getAttachments(apiClient, 'logs', 'dashboard');
          expect(listResponse.attachments.length).to.eql(1);
          expect(listResponse.attachments[0].id).to.eql(SEARCH_DASHBOARD_ID);

          // Clean up
          await unlinkAttachment(apiClient, 'logs', 'dashboard', SEARCH_DASHBOARD_ID);
        });

        it('unlinks a dashboard from a stream', async () => {
          await linkAttachment(apiClient, 'logs', 'dashboard', SEARCH_DASHBOARD_ID);

          const unlinkResponse = await unlinkAttachment(
            apiClient,
            'logs',
            'dashboard',
            SEARCH_DASHBOARD_ID
          );
          expect(unlinkResponse.acknowledged).to.eql(true);

          const listResponse = await getAttachments(apiClient, 'logs', 'dashboard');
          expect(listResponse.attachments.length).to.eql(0);
        });

        it('links the same dashboard to multiple streams', async () => {
          // Create child stream
          await putStream(apiClient, 'logs.child', {
            dashboards: [],
            rules: [],
            queries: [],
            stream: {
              description: '',
              ingest: {
                lifecycle: { inherit: {} },
                processing: { steps: [] },
                settings: {},
                wired: {
                  routing: [],
                  fields: {},
                },
              },
            },
          });

          await linkAttachment(apiClient, 'logs', 'dashboard', SEARCH_DASHBOARD_ID);
          await linkAttachment(apiClient, 'logs.child', 'dashboard', SEARCH_DASHBOARD_ID);

          const logsResponse = await getAttachments(apiClient, 'logs', 'dashboard');
          const childResponse = await getAttachments(apiClient, 'logs.child', 'dashboard');

          expect(logsResponse.attachments.length).to.eql(1);
          expect(childResponse.attachments.length).to.eql(1);

          // Clean up
          await unlinkAttachment(apiClient, 'logs', 'dashboard', SEARCH_DASHBOARD_ID);
          await unlinkAttachment(apiClient, 'logs.child', 'dashboard', SEARCH_DASHBOARD_ID);
          await deleteStream(apiClient, 'logs.child');
        });
      });

      describe('Rule attachments', () => {
        before(async () => {
          await kibanaServer.importExport.load(RULE_ARCHIVE, { space: SPACE_ID });
        });

        after(async () => {
          await kibanaServer.importExport.unload(RULE_ARCHIVE, { space: SPACE_ID });
        });

        it('links a rule to a stream', async () => {
          const linkResponse = await linkAttachment(apiClient, 'logs', 'rule', FIRST_RULE_ID);
          expect(linkResponse.acknowledged).to.eql(true);

          const listResponse = await getAttachments(apiClient, 'logs', 'rule');
          expect(listResponse.attachments.length).to.eql(1);
          expect(listResponse.attachments[0].id).to.eql(FIRST_RULE_ID);

          // Clean up
          await unlinkAttachment(apiClient, 'logs', 'rule', FIRST_RULE_ID);
        });

        it('unlinks a rule from a stream', async () => {
          await linkAttachment(apiClient, 'logs', 'rule', FIRST_RULE_ID);

          const unlinkResponse = await unlinkAttachment(apiClient, 'logs', 'rule', FIRST_RULE_ID);
          expect(unlinkResponse.acknowledged).to.eql(true);

          const listResponse = await getAttachments(apiClient, 'logs', 'rule');
          expect(listResponse.attachments.length).to.eql(0);
        });
      });
    });

    describe('Bulk operations', () => {
      before(async () => {
        await loadDashboards(kibanaServer, DASHBOARD_ARCHIVES, SPACE_ID);
        await kibanaServer.importExport.load(RULE_ARCHIVE, { space: SPACE_ID });
      });

      after(async () => {
        await unloadDashboards(kibanaServer, DASHBOARD_ARCHIVES, SPACE_ID);
        await kibanaServer.importExport.unload(RULE_ARCHIVE, { space: SPACE_ID });
      });

      it('bulk links multiple dashboards', async () => {
        await bulkAttachments(apiClient, 'logs', [
          { index: { type: 'dashboard', id: SEARCH_DASHBOARD_ID } },
          { index: { type: 'dashboard', id: BASIC_DASHBOARD_ID } },
        ]);

        const listResponse = await getAttachments(apiClient, 'logs', 'dashboard');
        expect(listResponse.attachments.length).to.eql(2);

        // Clean up
        await bulkAttachments(apiClient, 'logs', [
          { delete: { type: 'dashboard', id: SEARCH_DASHBOARD_ID } },
          { delete: { type: 'dashboard', id: BASIC_DASHBOARD_ID } },
        ]);
      });

      it('bulk unlinks multiple dashboards', async () => {
        await bulkAttachments(apiClient, 'logs', [
          { index: { type: 'dashboard', id: SEARCH_DASHBOARD_ID } },
          { index: { type: 'dashboard', id: BASIC_DASHBOARD_ID } },
        ]);

        await bulkAttachments(apiClient, 'logs', [
          { delete: { type: 'dashboard', id: SEARCH_DASHBOARD_ID } },
          { delete: { type: 'dashboard', id: BASIC_DASHBOARD_ID } },
        ]);

        const listResponse = await getAttachments(apiClient, 'logs', 'dashboard');
        expect(listResponse.attachments.length).to.eql(0);
      });

      it('bulk links mixed attachment types (dashboards and rules)', async () => {
        await bulkAttachments(apiClient, 'logs', [
          { index: { type: 'dashboard', id: SEARCH_DASHBOARD_ID } },
          { index: { type: 'dashboard', id: BASIC_DASHBOARD_ID } },
          { index: { type: 'rule', id: FIRST_RULE_ID } },
          { index: { type: 'rule', id: SECOND_RULE_ID } },
        ]);

        const allAttachments = await getAttachments(apiClient, 'logs');
        expect(allAttachments.attachments.length).to.eql(4);

        const dashboards = await getAttachments(apiClient, 'logs', 'dashboard');
        expect(dashboards.attachments.length).to.eql(2);

        const rules = await getAttachments(apiClient, 'logs', 'rule');
        expect(rules.attachments.length).to.eql(2);

        // Clean up
        await bulkAttachments(apiClient, 'logs', [
          { delete: { type: 'dashboard', id: SEARCH_DASHBOARD_ID } },
          { delete: { type: 'dashboard', id: BASIC_DASHBOARD_ID } },
          { delete: { type: 'rule', id: FIRST_RULE_ID } },
          { delete: { type: 'rule', id: SECOND_RULE_ID } },
        ]);
      });

      it('bulk operations with mixed actions (index and delete)', async () => {
        // First, link some attachments
        await bulkAttachments(apiClient, 'logs', [
          { index: { type: 'dashboard', id: SEARCH_DASHBOARD_ID } },
          { index: { type: 'rule', id: FIRST_RULE_ID } },
        ]);

        // Now do a mixed operation: add new ones and delete existing ones
        await bulkAttachments(apiClient, 'logs', [
          { delete: { type: 'dashboard', id: SEARCH_DASHBOARD_ID } },
          { index: { type: 'dashboard', id: BASIC_DASHBOARD_ID } },
          { index: { type: 'rule', id: SECOND_RULE_ID } },
        ]);

        const allAttachments = await getAttachments(apiClient, 'logs');
        expect(allAttachments.attachments.length).to.eql(3);

        const attachmentIds = allAttachments.attachments.map((a) => a.id).sort();
        expect(attachmentIds).to.eql([BASIC_DASHBOARD_ID, FIRST_RULE_ID, SECOND_RULE_ID].sort());

        // Clean up
        await bulkAttachments(apiClient, 'logs', [
          { delete: { type: 'dashboard', id: BASIC_DASHBOARD_ID } },
          { delete: { type: 'rule', id: FIRST_RULE_ID } },
          { delete: { type: 'rule', id: SECOND_RULE_ID } },
        ]);
      });
    });

    describe('Suggestions', () => {
      before(async () => {
        await loadDashboards(kibanaServer, DASHBOARD_ARCHIVES, SPACE_ID);
        await kibanaServer.importExport.load(RULE_ARCHIVE, { space: SPACE_ID });
      });

      after(async () => {
        await unloadDashboards(kibanaServer, DASHBOARD_ARCHIVES, SPACE_ID);
        await kibanaServer.importExport.unload(RULE_ARCHIVE, { space: SPACE_ID });
      });

      it('suggests all attachment types without type filter', async () => {
        const response = await getAttachmentSuggestions({
          apiClient,
          stream: 'logs',
          query: '',
          tags: [],
        });

        expect(response.suggestions.length).to.be.greaterThan(0);
        const types = response.suggestions.map((a) => a.type);
        expect(types).to.contain('dashboard');
        expect(types).to.contain('rule');
      });

      it('suggests only dashboards when type filter is dashboard', async () => {
        const response = await getAttachmentSuggestions({
          apiClient,
          stream: 'logs',
          type: 'dashboard',
          query: '',
          tags: [],
        });

        expect(response.suggestions.length).to.be.greaterThan(0);
        response.suggestions.forEach((suggestion) => {
          expect(suggestion.type).to.eql('dashboard');
        });
      });

      it('suggests only rules when type filter is rule', async () => {
        const response = await getAttachmentSuggestions({
          apiClient,
          stream: 'logs',
          type: 'rule',
          query: '',
          tags: [],
        });

        expect(response.suggestions.length).to.be.greaterThan(0);
        response.suggestions.forEach((suggestion) => {
          expect(suggestion.type).to.eql('rule');
        });
      });

      it('filters dashboard suggestions based on query', async () => {
        const response = await getAttachmentSuggestions({
          apiClient,
          stream: 'logs',
          type: 'dashboard',
          query: BASIC_DASHBOARD_TITLE,
          tags: [],
        });

        expect(response.suggestions.length).to.eql(1);
        expect(response.suggestions[0].id).to.eql(BASIC_DASHBOARD_ID);
        expect(response.suggestions[0].type).to.eql('dashboard');
      });

      it('filters dashboard suggestions based on tags', async () => {
        const response = await getAttachmentSuggestions({
          apiClient,
          stream: 'logs',
          type: 'dashboard',
          tags: [TAG_ID],
          query: '',
        });

        expect(response.suggestions.length).to.eql(1);
        response.suggestions.forEach((suggestion) => {
          expect(suggestion.type).to.eql('dashboard');
        });
      });
    });
  });
}
