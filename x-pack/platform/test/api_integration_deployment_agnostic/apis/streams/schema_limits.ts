/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { emptyAssets, MAX_STREAM_NAME_LENGTH } from '@kbn/streams-schema';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { disableStreams, enableStreams } from './helpers/requests';

const TOO_LONG_NAME = 'a'.repeat(MAX_STREAM_NAME_LENGTH + 1);
const MAX_NAME = `logs.otel.${'a'.repeat(MAX_STREAM_NAME_LENGTH - 'logs.otel.'.length)}`;

const wiredStreamBody = {
  stream: {
    type: 'wired' as const,
    description: '',
    ingest: {
      lifecycle: { inherit: {} },
      processing: { steps: [] },
      routing: [],
      settings: {},
      failure_store: { inherit: {} },
    },
  },
  ...emptyAssets,
};

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Public route schema limits', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('GET /api/streams/{name}', () => {
      it('rejects name longer than MAX_STREAM_NAME_LENGTH with 400', async () => {
        await apiClient
          .fetch('GET /api/streams/{name} 2023-10-31', {
            params: { path: { name: TOO_LONG_NAME } },
          })
          .expect(400);
      });

      it('accepts name exactly at MAX_STREAM_NAME_LENGTH', async () => {
        // Stream does not exist; expect 404, not 400 (schema passed)
        await apiClient
          .fetch('GET /api/streams/{name} 2023-10-31', {
            params: { path: { name: MAX_NAME } },
          })
          .expect(404);
      });
    });

    describe('PUT /api/streams/{name}', () => {
      it('rejects name longer than MAX_STREAM_NAME_LENGTH with 400', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name} 2023-10-31', {
            params: {
              path: { name: TOO_LONG_NAME },
              body: wiredStreamBody,
            },
          })
          .expect(400);
      });
    });

    describe('DELETE /api/streams/{name}', () => {
      it('rejects name longer than MAX_STREAM_NAME_LENGTH with 400', async () => {
        await apiClient
          .fetch('DELETE /api/streams/{name} 2023-10-31', {
            params: { path: { name: TOO_LONG_NAME } },
          })
          .expect(400);
      });
    });

    describe('GET /api/streams/{name}/_ingest', () => {
      it('rejects name longer than MAX_STREAM_NAME_LENGTH with 400', async () => {
        await apiClient
          .fetch('GET /api/streams/{name}/_ingest 2023-10-31', {
            params: { path: { name: TOO_LONG_NAME } },
          })
          .expect(400);
      });
    });

    describe('PUT /api/streams/{name}/_ingest', () => {
      it('rejects name longer than MAX_STREAM_NAME_LENGTH with 400', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
            params: {
              path: { name: TOO_LONG_NAME },
              body: {
                ingest: {
                  lifecycle: { inherit: {} },
                  processing: { steps: [] },
                  routing: [],
                  settings: {},
                  failure_store: { inherit: {} },
                },
              },
            },
          })
          .expect(400);
      });
    });

    describe('POST /api/streams/{name}/_fork', () => {
      it('rejects parent name longer than MAX_STREAM_NAME_LENGTH with 400', async () => {
        await apiClient
          .fetch('POST /api/streams/{name}/_fork 2023-10-31', {
            params: {
              path: { name: TOO_LONG_NAME },
              body: {
                stream: { name: 'logs.otel.child' },
                where: { field: 'attributes.env', eq: 'prod' },
              },
            },
          })
          .expect(400);
      });

      it('rejects child stream name longer than MAX_STREAM_NAME_LENGTH with 400', async () => {
        await apiClient
          .fetch('POST /api/streams/{name}/_fork 2023-10-31', {
            params: {
              path: { name: 'logs.otel' },
              body: {
                stream: { name: TOO_LONG_NAME },
                where: { field: 'attributes.env', eq: 'prod' },
              },
            },
          })
          .expect(400);
      });
    });

    describe('PUT /api/streams/{name}/_query', () => {
      it('rejects name longer than MAX_STREAM_NAME_LENGTH with 400', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name}/_query 2023-10-31', {
            params: {
              path: { name: TOO_LONG_NAME },
              body: { query: { esql: 'FROM logs.otel | LIMIT 1' } },
            },
          })
          .expect(400);
      });

      it('rejects esql longer than 65535 chars with 400', async () => {
        await apiClient
          .fetch('PUT /api/streams/{name}/_query 2023-10-31', {
            params: {
              path: { name: 'logs.otel.query-limit-test' },
              body: {
                query: { esql: 'FROM logs.otel | WHERE message == "' + 'x'.repeat(65502) + '"' },
              },
            },
          })
          .expect(400);
      });

      it('accepts esql exactly at 65535 chars', async () => {
        const paddingNeeded = 65535 - 'FROM logs.otel | WHERE message == ""'.length;
        const esql = 'FROM logs.otel | WHERE message == "' + 'x'.repeat(paddingNeeded) + '"';
        // Schema validation passes; the handler may return any non-schema status
        // (404, feature-flag error, etc.) but must not return a Zod 400.
        const response = await apiClient.fetch('PUT /api/streams/{name}/_query 2023-10-31', {
          params: {
            path: { name: 'logs.otel.query-limit-test' },
            body: { query: { esql } },
          },
        });
        expect(response.status).not.to.equal(400);
      });
    });

    describe('GET /api/streams/{name}/_query', () => {
      it('rejects name longer than MAX_STREAM_NAME_LENGTH with 400', async () => {
        await apiClient
          .fetch('GET /api/streams/{name}/_query 2023-10-31', {
            params: { path: { name: TOO_LONG_NAME } },
          })
          .expect(400);
      });
    });
  });
}
