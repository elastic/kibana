/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Streams } from '@kbn/streams-schema';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { disableStreams, enableStreams, indexDocument } from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');

  const TEST_STREAM_NAME = 'logs-test-default';
  const TEST_INDEX_NAME = 'some-non-datastream-place';

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Discover integration', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
      await esClient.indices.delete({
        index: TEST_INDEX_NAME,
      });
      await esClient.indices.deleteDataStream({
        name: TEST_STREAM_NAME,
      });
    });

    it('endpoint is resolving classic stream properly', async () => {
      const doc = {
        message: '2023-01-01T00:00:10.000Z error test',
      };
      const response = await indexDocument(esClient, TEST_STREAM_NAME, doc);
      expect(response.result).to.eql('created');

      const {
        body: { stream },
        status,
      } = await apiClient.fetch('GET /internal/streams/_resolve_index', {
        params: {
          query: {
            index: response._index,
          },
        },
      });

      expect(status).to.eql(200);
      expect(stream).not.to.be(undefined);
      expect(stream).to.eql({
        name: TEST_STREAM_NAME,
        description: '',
        updated_at: stream!.updated_at,
        ingest: {
          lifecycle: { inherit: {} },
          settings: {},
          processing: {
            steps: [],
            updated_at: (stream as Streams.ClassicStream.Definition).ingest.processing.updated_at,
          },
          classic: {},
          failure_store: { inherit: {} },
        },
      } satisfies Streams.ClassicStream.Definition);
    });

    it('endpoint is resolving wired stream properly', async () => {
      const doc = {
        message: '2023-01-01T00:00:10.000Z error test',
      };
      const response = await indexDocument(esClient, 'logs', doc);

      expect(response.result).to.eql('created');

      const {
        body: { stream },
        status,
      } = await apiClient.fetch('GET /internal/streams/_resolve_index', {
        params: {
          query: {
            index: response._index,
          },
        },
      });

      expect(status).to.eql(200);

      expect(stream?.name).to.eql('logs');
    });

    it('endpoint is returning nothing for regular index', async () => {
      const doc = {
        message: '2023-01-01T00:00:10.000Z error test',
      };
      const response = await indexDocument(esClient, TEST_INDEX_NAME, doc);

      expect(response.result).to.eql('created');

      const {
        body: { stream },
        status,
      } = await apiClient.fetch('GET /internal/streams/_resolve_index', {
        params: {
          query: {
            index: response._index,
          },
        },
      });

      expect(status).to.eql(200);

      expect(stream).to.eql(undefined);
    });
  });
}
