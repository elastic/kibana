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
  linkRule,
  unlinkRule,
  putStream,
  deleteStream,
} from '../helpers/requests';
import type { StreamsSupertestRepositoryClient } from '../helpers/repository_client';
import { createStreamsRepositoryAdminClient } from '../helpers/repository_client';
import type { DeploymentAgnosticFtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');

  let apiClient: StreamsSupertestRepositoryClient;

  const kibanaServer = getService('kibanaServer');

  const SPACE_ID = 'default';
  const archive = 'x-pack/platform/test/api_integration/fixtures/kbn_archives/streams/rules.json';

  const FIRST_RULE_ATTACHMENT_LINKING = '09cef989-3ded-4a1e-b2b0-53d491d13397';
  const SECOND_RULE_ATTACHMENT_LINKING = '312638da-43d1-4d6e-8fb8-9cae201cdd3a';

  describe('Rule attachment linking', function () {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('after linking a rule', () => {
      before(async () => {
        await kibanaServer.importExport.load(archive, { space: SPACE_ID });

        await linkRule(apiClient, 'logs', FIRST_RULE_ATTACHMENT_LINKING);
      });

      after(async () => {
        await unlinkRule(apiClient, 'logs', FIRST_RULE_ATTACHMENT_LINKING);
        await kibanaServer.importExport.unload(archive, { space: SPACE_ID });
      });

      it('lists the rule in the stream response', async () => {
        const response = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
          params: { path: { name: 'logs' } },
        });

        expect(response.status).to.eql(200);
        expect(response.body.rules?.length).to.eql(1);
      });

      it('lists the rule in the rules get response', async () => {
        const response = await apiClient.fetch('GET /api/streams/{name}/rules 2023-10-31', {
          params: { path: { name: 'logs' } },
        });

        expect(response.status).to.eql(200);
        expect(response.body.rules.length).to.eql(1);
      });

      describe('add second rule', () => {
        before(async () => {
          await linkRule(apiClient, 'logs', SECOND_RULE_ATTACHMENT_LINKING);
        });

        after(async () => {
          await unlinkRule(apiClient, 'logs', SECOND_RULE_ATTACHMENT_LINKING);
        });

        it('lists the second rule in the stream response', async () => {
          const response = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
            params: { path: { name: 'logs' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.rules?.length).to.eql(2);
        });

        it('lists the second rule in the rules get response', async () => {
          const response = await apiClient.fetch('GET /api/streams/{name}/rules 2023-10-31', {
            params: { path: { name: 'logs' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.rules.length).to.eql(2);
        });

        it('unlinking one rule keeps the other', async () => {
          await unlinkRule(apiClient, 'logs', FIRST_RULE_ATTACHMENT_LINKING);

          const response = await apiClient.fetch('GET /api/streams/{name}/rules 2023-10-31', {
            params: { path: { name: 'logs' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.rules.length).to.eql(1);
        });
      });

      describe('after disabling', () => {
        before(async () => {
          // disabling and re-enabling streams wipes the attachment links
          await disableStreams(apiClient);
          await enableStreams(apiClient);
        });

        it('dropped all rules', async () => {
          const response = await apiClient.fetch('GET /api/streams/{name}/rules 2023-10-31', {
            params: { path: { name: 'logs' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.rules.length).to.eql(0);
        });

        it('recovers on write and lists the linked rule', async () => {
          await linkRule(apiClient, 'logs', FIRST_RULE_ATTACHMENT_LINKING);

          const response = await apiClient.fetch('GET /api/streams/{name}/rules 2023-10-31', {
            params: { path: { name: 'logs' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.rules.length).to.eql(1);
        });
      });

      describe('after deleting the rule', () => {
        before(async () => {
          await kibanaServer.importExport.unload(archive, { space: SPACE_ID });
        });

        after(async () => {
          // Reload the rule archive for other tests
          await kibanaServer.importExport.load(archive, { space: SPACE_ID });
        });

        it('no longer lists the rule as a linked attachment', async () => {
          const response = await apiClient.fetch('GET /api/streams/{name}/rules 2023-10-31', {
            params: { path: { name: 'logs' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.rules.length).to.eql(0);
        });
      });

      describe('linking a rule to multiple streams', () => {
        before(async () => {
          // Create one additional stream to test with
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

          // Link the same rule to both logs and logs.child
          await linkRule(apiClient, 'logs', FIRST_RULE_ATTACHMENT_LINKING);
          await linkRule(apiClient, 'logs.child', FIRST_RULE_ATTACHMENT_LINKING);
        });

        after(async () => {
          await deleteStream(apiClient, 'logs.child');
        });

        it('lists the rule in the logs stream', async () => {
          const response = await apiClient.fetch('GET /api/streams/{name}/rules 2023-10-31', {
            params: { path: { name: 'logs' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.rules.length).to.eql(1);
          expect(response.body.rules[0].id).to.eql(FIRST_RULE_ATTACHMENT_LINKING);
        });

        it('lists the rule in the logs.child stream', async () => {
          const response = await apiClient.fetch('GET /api/streams/{name}/rules 2023-10-31', {
            params: { path: { name: 'logs.child' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.rules.length).to.eql(1);
          expect(response.body.rules[0].id).to.eql(FIRST_RULE_ATTACHMENT_LINKING);
        });

        it('unlinking from one stream does not affect the other stream', async () => {
          await unlinkRule(apiClient, 'logs.child', FIRST_RULE_ATTACHMENT_LINKING);

          const logsResponse = await apiClient.fetch('GET /api/streams/{name}/rules 2023-10-31', {
            params: { path: { name: 'logs' } },
          });

          const childResponse = await apiClient.fetch('GET /api/streams/{name}/rules 2023-10-31', {
            params: { path: { name: 'logs.child' } },
          });

          expect(logsResponse.status).to.eql(200);
          expect(logsResponse.body.rules.length).to.eql(1);
          expect(logsResponse.body.rules[0].id).to.eql(FIRST_RULE_ATTACHMENT_LINKING);

          expect(childResponse.status).to.eql(200);
          expect(childResponse.body.rules.length).to.eql(0);
        });
      });
    });

    describe('on unmanaged Classic stream', () => {
      before(async () => {
        await esClient.indices.createDataStream({
          name: 'logs-testlogs-default',
        });
      });
      after(async () => {
        await esClient.indices.deleteDataStream({
          name: 'logs-testlogs-default',
        });
      });
      it('does not list any rules but returns 200', async () => {
        const response = await apiClient.fetch('GET /api/streams/{name}/rules 2023-10-31', {
          params: { path: { name: 'logs-testlogs-default' } },
        });

        expect(response.status).to.eql(200);
        expect(response.body.rules.length).to.eql(0);
      });
    });
  });
}
