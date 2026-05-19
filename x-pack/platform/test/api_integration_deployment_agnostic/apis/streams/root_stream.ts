/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { emptyAssets } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import { omit } from 'lodash';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import {
  disableStreams,
  enableStreams,
  indexDocument,
  putStream,
  deleteStream,
  getStream,
} from './helpers/requests';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;
  const esClient = getService('es');

  describe('Root streams API', () => {
    // Test logs.otel and logs.ecs root streams with the same validation rules
    ['logs.otel', 'logs.ecs'].forEach((rootStream) => {
      // Each root stream has stream-specific base fields that cannot have their type changed
      const baseFieldToTest = rootStream === 'logs.ecs' ? 'log.level' : 'severity_text';

      describe(`${rootStream} root stream`, () => {
        before(async () => {
          apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
          await enableStreams(apiClient);
        });

        after(async () => {
          await disableStreams(apiClient);
        });

        it('Should allow processing changes', async () => {
          // Fetch the current stream definition to get the real field definitions
          const currentStream = await getStream(apiClient, rootStream);

          // Type assertion: we know root streams are wired streams
          const wiredStream = currentStream as Streams.WiredStream.GetResponse;

          const body: Streams.WiredStream.UpsertRequest = {
            ...emptyAssets,
            stream: {
              type: 'wired',
              description: '',
              ingest: {
                ...wiredStream.stream.ingest,
                processing: {
                  steps: [
                    {
                      action: 'grok' as const,
                      from: 'body.text',
                      patterns: [
                        '%{TIMESTAMP_ISO8601:attributes.inner_timestamp} %{LOGLEVEL:severity_text} %{GREEDYDATA:attributes.message2}',
                      ],
                      where: { always: {} },
                    },
                  ],
                },
              },
            },
          };
          const response = await putStream(apiClient, rootStream, body);
          expect(response).to.have.property('acknowledged', true);
        });

        it('Should not allow changing base field type', async () => {
          // Fetch the current stream definition to get the real field definitions
          const currentStream = await getStream(apiClient, rootStream);

          // Type assertion: we know root streams are wired streams
          const wiredStream = currentStream as Streams.WiredStream.GetResponse;

          const body: Streams.WiredStream.UpsertRequest = {
            ...emptyAssets,
            stream: {
              type: 'wired',
              description: '',
              ingest: {
                ...wiredStream.stream.ingest,
                processing: omit(wiredStream.stream.ingest.processing, 'updated_at'),
                wired: {
                  ...wiredStream.stream.ingest.wired,
                  fields: {
                    ...wiredStream.stream.ingest.wired.fields,
                    [baseFieldToTest]: {
                      type: 'boolean',
                    },
                  },
                },
              },
            },
          };
          const response = await putStream(apiClient, rootStream, body, 400);

          expect(response).to.have.property(
            'message',
            `Desired stream state is invalid: Default root stream field '${baseFieldToTest}' only allows description changes`
          );
        });

        it('Should allow changing base field description', async () => {
          const currentStream = await getStream(apiClient, rootStream);
          const wiredStream = currentStream as Streams.WiredStream.GetResponse;
          const currentField = wiredStream.stream.ingest.wired.fields[baseFieldToTest];

          const body: Streams.WiredStream.UpsertRequest = {
            ...emptyAssets,
            stream: {
              type: 'wired',
              description: '',
              ingest: {
                ...wiredStream.stream.ingest,
                processing: omit(wiredStream.stream.ingest.processing, 'updated_at'),
                wired: {
                  ...wiredStream.stream.ingest.wired,
                  fields: {
                    ...wiredStream.stream.ingest.wired.fields,
                    [baseFieldToTest]: {
                      ...currentField,
                      description: 'updated description',
                    },
                  },
                },
              },
            },
          };
          const response = await putStream(apiClient, rootStream, body);
          expect(response).to.have.property('acknowledged', true);
        });

        it('Should allow adding custom field mappings', async () => {
          // Fetch the current stream definition to get the real field definitions
          const currentStream = await getStream(apiClient, rootStream);

          // Type assertion: we know root streams are wired streams
          const wiredStream = currentStream as Streams.WiredStream.GetResponse;

          const body: Streams.WiredStream.UpsertRequest = {
            ...emptyAssets,
            stream: {
              type: 'wired',
              description: '',
              ingest: {
                ...wiredStream.stream.ingest,
                processing: omit(wiredStream.stream.ingest.processing, 'updated_at'),
                wired: {
                  ...wiredStream.stream.ingest.wired,
                  fields: {
                    ...wiredStream.stream.ingest.wired.fields,
                    my_custom_field: {
                      type: 'keyword',
                    },
                  },
                },
              },
            },
          };
          const response = await putStream(apiClient, rootStream, body);
          expect(response).to.have.property('acknowledged', true);
        });

        it('Should allow routing changes', async () => {
          // Fetch the current stream definition to get the real field definitions
          const currentStream = await getStream(apiClient, rootStream);

          // Type assertion: we know root streams are wired streams
          const wiredStream = currentStream as Streams.WiredStream.GetResponse;

          const body: Streams.WiredStream.UpsertRequest = {
            ...emptyAssets,
            stream: {
              type: 'wired',
              description: '',
              ingest: {
                ...wiredStream.stream.ingest,
                processing: omit(wiredStream.stream.ingest.processing, 'updated_at'),
                wired: {
                  ...wiredStream.stream.ingest.wired,
                  routing: [
                    {
                      destination: `${rootStream}.gcpcloud`,
                      where: {
                        field: 'cloud.provider',
                        eq: 'gcp',
                      },
                      status: 'enabled',
                    },
                  ],
                },
              },
            },
          };
          const response = await putStream(apiClient, rootStream, body);
          expect(response).to.have.property('acknowledged', true);
        });

        it('Should route direct writes to child stream to failure store', async () => {
          const doc = {
            '@timestamp': '2024-01-01T00:00:20.000Z',
            message: 'test',
          };

          // Direct writes to child streams are allowed but routed to the failure store
          // The routing test above creates the child stream, so this write should succeed
          const response = await indexDocument(esClient, `${rootStream}.gcpcloud`, doc, false);

          // Verify the document was routed to the failure store
          expect(response.failure_store).to.be('used');
        });
      });
    });

    describe('Root stream deletion', () => {
      before(async () => {
        apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
        await enableStreams(apiClient);
      });

      after(async () => {
        await disableStreams(apiClient);
      });

      it('should NOT allow deletion of logs.otel root stream', async () => {
        const response = await deleteStream(apiClient, 'logs.otel', 400);
        expect(response).to.have.property('message', 'Cannot delete root stream');
      });

      it('should NOT allow deletion of logs.ecs root stream', async () => {
        const response = await deleteStream(apiClient, 'logs.ecs', 400);
        expect(response).to.have.property('message', 'Cannot delete root stream');
      });
    });
  });
}
