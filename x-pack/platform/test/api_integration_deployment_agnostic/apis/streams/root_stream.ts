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
import { disableStreams, enableStreams, indexDocument, putStream } from './helpers/requests';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';

const rootStreamDefinition: Streams.WiredStream.Definition = {
  name: 'logs',
  description: '',
  updated_at: new Date().toISOString(),
  ingest: {
    lifecycle: { dsl: {} },
    processing: { steps: [], updated_at: new Date().toISOString() },
    settings: {},
    wired: {
      routing: [],
      fields: {
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
      },
    },
    failure_store: {
      lifecycle: { enabled: { data_retention: '30d' } },
    },
  },
};

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;
  const esClient = getService('es');

  describe('Root stream', () => {
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
      const response = await putStream(apiClient, 'logs', body, 400);
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
      const response = await putStream(apiClient, 'logs', body, 400);

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
                  destination: 'logs.gcpcloud',
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
      const response = await putStream(apiClient, 'logs', body);
      expect(response).to.have.property('acknowledged', true);
    });

    it('Should not allow sending data directly to a child stream', async () => {
      const doc = {
        '@timestamp': '2024-01-01T00:00:20.000Z',
        message: 'test',
      };
      const response = await indexDocument(esClient, 'logs.gcpcloud', doc, false);
      expect(response.failure_store).to.be('used');
    });
  });
}
