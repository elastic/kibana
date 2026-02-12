/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { emptyAssets } from '@kbn/streams-schema';
import type { FieldDefinition, Streams } from '@kbn/streams-schema';
import { omit } from 'lodash';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import {
  disableStreams,
  enableStreams,
  indexDocument,
  putStream,
  deleteStream,
} from './helpers/requests';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';

// OTEL base fields used by logs.otel root stream
const otelBaseFields: FieldDefinition = {
  '@timestamp': {
    type: 'date',
  },
  'scope.name': {
    type: 'keyword',
  },
  trace_id: {
    type: 'keyword',
  },
  span_id: {
    type: 'keyword',
  },
  event_name: {
    type: 'keyword',
  },
  severity_text: {
    type: 'keyword',
  },
  'body.text': {
    type: 'match_only_text',
  },
  severity_number: {
    type: 'long',
  },
  'resource.attributes.host.name': {
    type: 'keyword',
  },
  'resource.attributes.service.name': {
    type: 'keyword',
  },
  'stream.name': {
    type: 'system',
  },
};

// Helper function to create root stream definition
function createRootStreamDefinition(
  name: string,
  fields: FieldDefinition
): Streams.WiredStream.Definition {
  return {
    name,
    description: '',
    updated_at: new Date().toISOString(),
    ingest: {
      lifecycle: { dsl: {} },
      processing: { steps: [], updated_at: new Date().toISOString() },
      settings: {},
      wired: {
        routing: [],
        fields,
      },
      failure_store: {
        lifecycle: { enabled: { data_retention: '30d' } },
      },
    },
  };
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;
  const esClient = getService('es');

  describe('Root streams API', () => {
    // Test logs.otel and logs.ecs root streams with the same validation rules
    ['logs.otel', 'logs.ecs'].forEach((rootStream) => {
      describe(`${rootStream} root stream`, () => {
        // Get the correct root stream definition based on the stream name
        const rootStreamDefinition = createRootStreamDefinition(
          rootStream,
          rootStream === 'logs.otel' ? otelBaseFields : {}
        );

        before(async () => {
          apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
          await enableStreams(apiClient);
        });

        after(async () => {
          await disableStreams(apiClient);
        });

        it('Should not allow processing changes', async () => {
          const body: Streams.WiredStream.UpsertRequest = {
            ...emptyAssets,
            stream: {
              description: '',
              ingest: {
                ...rootStreamDefinition.ingest,
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
          const response = await putStream(apiClient, rootStream, body, 400);
          expect(response).to.have.property(
            'message',
            'Desired stream state is invalid: Root stream processing rules cannot be changed'
          );
        });

        it('Should not allow fields changes', async () => {
          const body: Streams.WiredStream.UpsertRequest = {
            ...emptyAssets,
            stream: {
              description: '',
              ingest: {
                ...rootStreamDefinition.ingest,
                processing: omit(rootStreamDefinition.ingest.processing, 'updated_at'),
                wired: {
                  ...rootStreamDefinition.ingest.wired,
                  fields: {
                    ...rootStreamDefinition.ingest.wired.fields,
                    'log.level': {
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
            'Desired stream state is invalid: Root stream fields cannot be changed'
          );
        });

        it('Should allow routing changes', async () => {
          const body: Streams.WiredStream.UpsertRequest = {
            ...emptyAssets,
            stream: {
              description: '',
              ingest: {
                ...rootStreamDefinition.ingest,
                processing: omit(rootStreamDefinition.ingest.processing, 'updated_at'),
                wired: {
                  ...rootStreamDefinition.ingest.wired,
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

        it('Should not allow sending data directly to a child stream', async () => {
          const doc = {
            '@timestamp': '2024-01-01T00:00:20.000Z',
            message: 'test',
          };
          const response = await indexDocument(esClient, `${rootStream}.gcpcloud`, doc, false);
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
