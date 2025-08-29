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
  linkRule,
  unlinkRule,
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
  const ARCHIVES = [
    'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/search.json',
    'src/platform/test/api_integration/fixtures/kbn_archiver/saved_objects/basic.json',
    'x-pack/platform/test/api_integration/fixtures/kbn_archives/streams/rules.json',
  ];

  const RULE_ID_1 = '09cef989-3ded-4a1e-b2b0-53d491d13397';
  const RULE_ID_2 = '312638da-43d1-4d6e-8fb8-9cae201cdd3a';

  describe('Asset links', function () {
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

    describe('after linking a rule', () => {
      before(async () => {
        for (const archive of ARCHIVES) {
          await kibanaServer.importExport.load(archive, { space: SPACE_ID });
        }

        await linkRule(apiClient, 'logs', RULE_ID_1);
      });

      after(async () => {
        await unlinkRule(apiClient, 'logs', RULE_ID_1);
        for (const archive of ARCHIVES) {
          await kibanaServer.importExport.unload(archive, { space: SPACE_ID });
        }
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
          await linkRule(apiClient, 'logs', RULE_ID_2);
        });

        after(async () => {
          await unlinkRule(apiClient, 'logs', RULE_ID_2);
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

        it('unlink one rule and keeps the other', async () => {
          await unlinkRule(apiClient, 'logs', RULE_ID_1);

          const response = await apiClient.fetch('GET /api/streams/{name}/rules 2023-10-31', {
            params: { path: { name: 'logs' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.rules.length).to.eql(1);
        });
      });

      describe('after disabling', () => {
        before(async () => {
          // disabling and re-enabling streams wipes the asset links
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
          await linkRule(apiClient, 'logs', RULE_ID_1);

          const response = await apiClient.fetch('GET /api/streams/{name}/rules 2023-10-31', {
            params: { path: { name: 'logs' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.rules.length).to.eql(1);
        });
      });

      describe('after deleting the rule', () => {
        before(async () => {
          await kibanaServer.importExport.unload(
            'x-pack/platform/test/api_integration/fixtures/kbn_archives/streams/rules.json',
            { space: SPACE_ID }
          );
        });

        after(async () => {
          // Reload the rule archive for other tests
          await kibanaServer.importExport.load(
            'x-pack/platform/test/api_integration/fixtures/kbn_archives/streams/rules.json',
            { space: SPACE_ID }
          );
        });

        it('no longer lists the rule as a linked asset', async () => {
          const response = await apiClient.fetch('GET /api/streams/{name}/rules 2023-10-31', {
            params: { path: { name: 'logs' } },
          });

          expect(response.status).to.eql(200);
          expect(response.body.rules.length).to.eql(0);
        });
      });
    });

    describe('on class stream that has not been touched yet', () => {
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
