/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { disableStreams, enableStreams, indexDocument } from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  const config = getService('config');
  const retry = getService('retry');
  const isServerless = !!config.get('serverless');

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Deferred data stream materialization', function () {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      // Wait for startup enableStreams to finish (may hold a lock)
      await retry.tryForTime(30000, async () => {
        await enableStreams(apiClient);
      });
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    if (!isServerless) {
      it('materializes missing backing data streams for root streams on enable', async () => {
        await enableStreams(apiClient);

        for (const rootStream of ['logs.otel', 'logs.ecs']) {
          const dsBefore = await esClient.indices.getDataStream({ name: rootStream });
          expect(dsBefore.data_streams).to.have.length(1);
          expect(dsBefore.data_streams[0].name).to.be(rootStream);
        }

        await esClient.indices.deleteDataStream({ name: 'logs.otel' });
        await esClient.indices.deleteDataStream({ name: 'logs.ecs' });

        for (const rootStream of ['logs.otel', 'logs.ecs']) {
          const dsCheck = await esClient.indices.exists({ index: rootStream });
          expect(dsCheck).to.be(false);
        }

        const enableResponse = await apiClient
          .fetch('POST /api/streams/_enable 2023-10-31')
          .expect(200);
        expect(enableResponse.body.result).to.eql('created');

        for (const rootStream of ['logs.otel', 'logs.ecs']) {
          const dsAfter = await esClient.indices.getDataStream({ name: rootStream });
          expect(dsAfter.data_streams).to.have.length(1);
          expect(dsAfter.data_streams[0].name).to.be(rootStream);
        }
      });

      it('returns noop when all backing data streams already exist', async () => {
        await enableStreams(apiClient);

        const enableResponse = await apiClient
          .fetch('POST /api/streams/_enable 2023-10-31')
          .expect(200);
        expect(enableResponse.body.result).to.eql('noop');
      });

      it('allows indexing to root streams after materializing deferred data streams', async () => {
        await enableStreams(apiClient);

        await esClient.indices.deleteDataStream({ name: 'logs.otel' });

        await enableStreams(apiClient);

        const doc = {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          message: JSON.stringify({
            '@timestamp': '2024-01-01T00:00:00.000Z',
            'log.level': 'info',
            'log.logger': 'deferred_test',
            message: 'test deferred materialization',
          }),
        };
        const response = await indexDocument(esClient, 'logs.otel', doc);
        expect(response.result).to.eql('created');
      });
    }
  });
}
