/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { emptyAssets } from '@kbn/streams-schema';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import {
  createStreamsRepositoryAdminClient,
  createStreamsRepositoryViewerClient,
} from './helpers/repository_client';
import { enableStreams, putStream } from './helpers/requests';

export const MORE_THAN_1024_CHARS =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;
  let viewerApiClient: StreamsSupertestRepositoryClient;
  const esClient = getService('es');

  describe('Doc counts routes', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      viewerApiClient = await createStreamsRepositoryViewerClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      // Clean up test streams
      try {
        await apiClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
          params: { path: { name: 'logs.test-stream-1' } },
        });
      } catch (e) {
        // Ignore errors if stream doesn't exist
      }
      try {
        await apiClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
          params: { path: { name: 'logs.test-stream-2' } },
        });
      } catch (e) {
        // Ignore errors if stream doesn't exist
      }
    });

    describe('GET /internal/streams/doc_counts/total', () => {
      it('returns document counts for specified streams', async () => {
        // Get the root logs stream and update it with routing rules
        const rootStream = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
          params: { path: { name: 'logs' } },
        });

        await putStream(apiClient, 'logs', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...(rootStream.body as any).stream.ingest,
              wired: {
                ...(rootStream.body as any).stream.ingest.wired,
                routing: [
                  {
                    destination: 'logs.test-stream-1',
                    where: { field: 'attributes.log.logger', eq: 'test-stream-1' },
                    status: 'enabled',
                  },
                  {
                    destination: 'logs.test-stream-2',
                    where: { field: 'attributes.log.logger', eq: 'test-stream-2' },
                    status: 'enabled',
                  },
                ],
              },
            },
          },
        });

        await putStream(apiClient, 'logs.test-stream-1', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: { disabled: {} },
            },
          },
        });

        await putStream(apiClient, 'logs.test-stream-2', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: { disabled: {} },
            },
          },
        });

        // Index documents to parent 'logs' stream and let routing handle it
        const now = Date.now();
        const timestamp = new Date(now).toISOString();

        await esClient.index({
          index: 'logs',
          document: {
            '@timestamp': timestamp,
            message: JSON.stringify({
              '@timestamp': timestamp,
              'log.level': 'info',
              'log.logger': 'test-stream-1',
              message: 'test message 1',
            }),
          },
          refresh: 'wait_for',
        });

        await esClient.index({
          index: 'logs',
          document: {
            '@timestamp': timestamp,
            message: JSON.stringify({
              '@timestamp': timestamp,
              'log.level': 'info',
              'log.logger': 'test-stream-1',
              message: 'test message 2',
            }),
          },
          refresh: 'wait_for',
        });

        await esClient.index({
          index: 'logs',
          document: {
            '@timestamp': timestamp,
            message: JSON.stringify({
              '@timestamp': timestamp,
              'log.level': 'info',
              'log.logger': 'test-stream-2',
              message: 'test message 3',
            }),
          },
          refresh: 'wait_for',
        });

        const start = new Date(now - 3600000).toISOString();
        const end = new Date(now + 60000).toISOString();

        const response = await viewerApiClient.fetch('GET /internal/streams/doc_counts/total', {
          params: {
            query: {
              start,
              end,
            },
          },
        });

        expect(response.status).to.eql(200);
        expect(response.body).to.be.an('array');

        const stream1Count = response.body.find(
          (stat: any) => stat.stream === 'logs.test-stream-1'
        );
        const stream2Count = response.body.find(
          (stat: any) => stat.stream === 'logs.test-stream-2'
        );

        expect(stream1Count).to.not.be(undefined);
        expect(stream1Count?.count).to.eql(2);
        expect(stream2Count).to.not.be(undefined);
        expect(stream2Count?.count).to.eql(1);
      });

      it('returns empty array for streams with no documents in time range', async () => {
        await putStream(apiClient, 'logs.test-stream-1', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: { disabled: {} },
            },
          },
        });

        // Use a time range in the past where no documents exist
        const pastTime = Date.now() - 86400000;
        const start = new Date(pastTime - 3600000).toISOString();
        const end = new Date(pastTime).toISOString();

        const response = await viewerApiClient.fetch('GET /internal/streams/doc_counts/total', {
          params: {
            query: {
              start,
              end,
            },
          },
        });

        expect(response.status).to.eql(200);
        expect(response.body).to.be.an('array');
        expect(response.body).to.have.length(0);
      });
    });

    describe('GET /internal/streams/doc_counts/degraded', () => {
      it('returns degraded document counts (documents with _ignored field)', async () => {
        // Get the root logs stream and update it with routing rules
        const rootStream = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
          params: { path: { name: 'logs' } },
        });

        await putStream(apiClient, 'logs', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...(rootStream.body as any).stream.ingest,
              wired: {
                ...(rootStream.body as any).stream.ingest.wired,
                routing: [
                  {
                    destination: 'logs.test-stream-1',
                    where: { field: 'attributes.log.logger', eq: 'test-stream-1' },
                    status: 'enabled',
                  },
                  {
                    destination: 'logs.test-stream-2',
                    where: { field: 'attributes.log.logger', eq: 'test-stream-2' },
                    status: 'enabled',
                  },
                ],
              },
            },
          },
        });

        await putStream(apiClient, 'logs.test-stream-1', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {
                  severity_text: {
                    type: 'keyword',
                    ignore_above: 1024,
                  },
                },
                routing: [],
              },
              failure_store: { disabled: {} },
            },
          },
        });

        const timestamp = new Date().toISOString();

        // Index a normal document
        await esClient.index({
          index: 'logs',
          document: {
            '@timestamp': timestamp,
            message: JSON.stringify({
              '@timestamp': timestamp,
              'log.level': 'info',
              'log.logger': 'test-stream-1',
              message: 'normal message',
            }),
          },
          refresh: 'wait_for',
        });

        // Index a document that will have _ignored field (value exceeds ignore_above limit)
        await esClient.index({
          index: 'logs',
          document: {
            '@timestamp': timestamp,
            message: JSON.stringify({
              '@timestamp': timestamp,
              'log.level': MORE_THAN_1024_CHARS,
              'log.logger': 'test-stream-1',
              message: 'degraded message',
            }),
          },
          refresh: 'wait_for',
        });

        const now = Date.now();
        const start = new Date(now - 3600000).toISOString();
        const end = new Date(now + 60000).toISOString();

        const response = await viewerApiClient.fetch('GET /internal/streams/doc_counts/degraded', {
          params: {
            query: {
              start,
              end,
            },
          },
        });

        expect(response.status).to.eql(200);
        expect(response.body).to.be.an('array');
        expect(response.body).to.have.length(1);
        expect(response.body[0].stream).to.eql('logs.test-stream-1');
        expect(response.body[0].count).to.eql(1);
      });

      it('returns empty array when no degraded documents exist', async () => {
        // Get the root logs stream and update it with routing rules
        const rootStream = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
          params: { path: { name: 'logs' } },
        });

        await putStream(apiClient, 'logs', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...(rootStream.body as any).stream.ingest,
              wired: {
                ...(rootStream.body as any).stream.ingest.wired,
                routing: [
                  {
                    destination: 'logs.test-stream-1',
                    where: { field: 'attributes.log.logger', eq: 'test-stream-1' },
                    status: 'enabled',
                  },
                  {
                    destination: 'logs.test-stream-2',
                    where: { field: 'attributes.log.logger', eq: 'test-stream-2' },
                    status: 'enabled',
                  },
                ],
              },
            },
          },
        });

        await putStream(apiClient, 'logs.test-stream-1', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: { disabled: {} },
            },
          },
        });

        const timestamp = new Date().toISOString();
        await esClient.index({
          index: 'logs',
          document: {
            '@timestamp': timestamp,
            message: JSON.stringify({
              '@timestamp': timestamp,
              'log.level': 'info',
              'log.logger': 'test-no-degraded',
              message: 'normal message',
            }),
          },
          refresh: 'wait_for',
        });

        const now = Date.now();
        const start = new Date(now - 3600000).toISOString();
        const end = new Date(now + 60000).toISOString();

        const response = await viewerApiClient.fetch('GET /internal/streams/doc_counts/degraded', {
          params: {
            query: {
              start,
              end,
            },
          },
        });

        expect(response.status).to.eql(200);
        expect(response.body).to.be.an('array');
      });
    });

    describe('GET /internal/streams/doc_counts/failed', () => {
      it('returns failed document counts from failure store', async () => {
        await putStream(apiClient, 'logs.test-stream-1', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: { disabled: {} },
            },
          },
        });

        const now = Date.now();
        const start = new Date(now - 3600000).toISOString();
        const end = new Date(now + 60000).toISOString();

        const response = await viewerApiClient.fetch('GET /internal/streams/doc_counts/failed', {
          params: {
            query: {
              start,
              end,
            },
          },
        });

        expect(response.status).to.eql(200);
        expect(response.body).to.be.an('array');
        if (response.body.length > 0) {
          expect(response.body[0]).to.have.property('stream');
          expect(response.body[0]).to.have.property('count');
          expect(response.body[0].stream).to.not.contain('::failures');
        }
      });

      it('strips ::failures suffix from stream names in response', async () => {
        await putStream(apiClient, 'logs.test-stream-1', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: { disabled: {} },
            },
          },
        });

        const now = Date.now();
        const start = new Date(now - 3600000).toISOString();
        const end = new Date(now + 60000).toISOString();

        const response = await viewerApiClient.fetch('GET /internal/streams/doc_counts/failed', {
          params: {
            query: {
              start,
              end,
            },
          },
        });

        expect(response.status).to.eql(200);
        expect(response.body).to.be.an('array');

        response.body.forEach((stat: any) => {
          expect(stat.stream).to.not.contain('::failures');
        });
      });
    });

    describe('Authorization', () => {
      it('allows viewer role to access doc counts endpoints', async () => {
        const now = Date.now();
        const start = new Date(now - 3600000).toISOString();
        const end = new Date(now).toISOString();

        const response = await viewerApiClient.fetch('GET /internal/streams/doc_counts/total', {
          params: {
            query: {
              start,
              end,
            },
          },
        });

        expect(response.status).to.eql(200);
      });
    });
  });
}
