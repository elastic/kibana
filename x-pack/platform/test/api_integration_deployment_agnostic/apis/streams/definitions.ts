/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { baseFields } from '@kbn/streams-plugin/server/lib/streams/component_templates/logs_layer';
import { ecsBaseFields } from '@kbn/streams-plugin/server/lib/streams/component_templates/logs_ecs_layer';
import { LOGS_ECS_STREAM_NAME, LOGS_OTEL_STREAM_NAME, Streams } from '@kbn/streams-schema';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { getStream, indexAndAssertTargetStream } from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  const retry = getService('retry');

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Streams Preconfigured Definitions', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      // Preconfigured roots land before the bulk upsert that creates their child streams.
      await retry.waitForWithTimeout(
        'preconfigured definitions to be installed',
        60_000,
        async () => {
          const { body } = await apiClient.fetch('GET /api/streams/_status').expect(200);
          if (body[LOGS_ECS_STREAM_NAME] !== true || body[LOGS_OTEL_STREAM_NAME] !== true) {
            return false;
          }
          await Promise.all(
            [`${LOGS_ECS_STREAM_NAME}.child`, `${LOGS_OTEL_STREAM_NAME}.child`].map((name) =>
              getStream(apiClient, name)
            )
          );
          return true;
        }
      );
    });

    it(`materializes backing data streams for wired root streams`, async () => {
      for (const streamName of ['logs.ecs', 'logs.otel']) {
        const response = await esClient.indices.getDataStream({ name: streamName });
        expect(response.data_streams).to.have.length(1);
        expect(response.data_streams[0].name).to.be(streamName);
      }
    });

    it('populates field definitions for logs.ecs root stream', async () => {
      const parsed = Streams.WiredStream.GetResponse.parse(await getStream(apiClient, 'logs.ecs'));
      expect(parsed.stream.ingest.wired.fields).to.eql(ecsBaseFields);
    });

    it('populates field definitions for logs.otel root stream', async () => {
      const parsed = Streams.WiredStream.GetResponse.parse(await getStream(apiClient, 'logs.otel'));
      expect(parsed.stream.ingest.wired.fields).to.eql(baseFields);
    });

    it('creates a child stream', async () => {
      for (const streamName of ['logs.ecs.child', 'logs.otel.child']) {
        await apiClient
          .fetch('GET /api/streams/{name} 2023-10-31', {
            params: { path: { name: streamName } },
          })
          .expect(200);
      }
    });

    it('routes document matching the condition to child stream', async () => {
      await indexAndAssertTargetStream(esClient, 'logs.ecs.child', {
        '@timestamp': '2024-01-01T00:00:10.000Z',
        'host.name': 'filebeat-1',
      });
      await indexAndAssertTargetStream(esClient, 'logs.otel.child', {
        '@timestamp': '2024-01-01T00:00:10.000Z',
        host: { name: 'filebeat-1' },
      });
    });

    it('does not route document not matching the condition to child stream', async () => {
      const doc = {
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: 'test',
      };
      await indexAndAssertTargetStream(esClient, 'logs.ecs', doc);
      await indexAndAssertTargetStream(esClient, 'logs.otel', doc);
    });
  });
}
