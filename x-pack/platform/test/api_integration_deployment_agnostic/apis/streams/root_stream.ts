/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Streams } from '@kbn/streams-schema';
import { get } from 'lodash';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { disableStreams, enableStreams, indexDocument, putStream } from './helpers/requests';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';

const rootStreamDefinition: Streams.WiredStream.Definition = {
  name: 'logs',
  description: '',
  ingest: {
    lifecycle: { dsl: {} },
    processing: [],
    wired: {
      routing: [],
      fields: {
        '@timestamp': {
          type: 'date',
        },
        'scope.dropped_attributes_count': {
          type: 'long',
        },
        dropped_attributes_count: {
          type: 'long',
        },
        'resource.dropped_attributes_count': {
          type: 'long',
        },
        'resource.schema_url': {
          type: 'keyword',
        },
        'scope.name': {
          type: 'keyword',
        },
        'scope.schema_url': {
          type: 'keyword',
        },
        'scope.version': {
          type: 'keyword',
        },
        observed_timestamp: {
          type: 'date',
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
        'stream.name': {
          type: 'system',
        },
      },
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
        dashboards: [],
        queries: [],
        stream: {
          description: '',
          ingest: {
            ...rootStreamDefinition.ingest,
            processing: [
              {
                grok: {
                  field: 'body.text',
                  patterns: [
                    '%{TIMESTAMP_ISO8601:attributes.inner_timestamp} %{LOGLEVEL:severity_text} %{GREEDYDATA:attributes.message2}',
                  ],
                  if: { always: {} },
                },
              },
            ],
          },
        },
      };
      const response = await putStream(apiClient, 'logs', body, 400);
      expect(response).to.have.property('message', 'Desired stream state is invalid');

      expect(get(response, 'attributes.caused_by.0.message')).to.eql(
        'Root stream processing rules cannot be changed'
      );
    });

    it('Should not allow fields changes', async () => {
      const body: Streams.WiredStream.UpsertRequest = {
        dashboards: [],
        queries: [],
        stream: {
          description: '',
          ingest: {
            ...rootStreamDefinition.ingest,
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

      expect(response).to.have.property('message', 'Desired stream state is invalid');

      expect(get(response, 'attributes.caused_by.0.message')).to.eql(
        'Root stream fields cannot be changed'
      );
    });

    it('Should allow routing changes', async () => {
      const body: Streams.WiredStream.UpsertRequest = {
        dashboards: [],
        queries: [],
        stream: {
          description: '',
          ingest: {
            ...rootStreamDefinition.ingest,
            wired: {
              ...rootStreamDefinition.ingest.wired,
              routing: [
                {
                  destination: 'logs.gcpcloud',
                  if: {
                    field: 'cloud.provider',
                    operator: 'eq',
                    value: 'gcp',
                  },
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
      let threw = false;
      try {
        await indexDocument(esClient, 'logs.gcpcloud', doc);
      } catch (e) {
        threw = true;
        expect(e.message).to.contain('stream.name is not set properly');
      }
      expect(threw).to.be(true);
    });
  });
}
