/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';
import type { RoutingStatus, Streams } from '@kbn/streams-schema';
import { emptyAssets } from '@kbn/streams-schema';
import {
  disableStreams,
  enableStreams,
  fetchDocument,
  forkStream,
  indexDocument,
  putStream,
} from './helpers/requests';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  let apiClient: StreamsSupertestRepositoryClient;

  describe('Enrichment', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
      const body = {
        stream: {
          name: 'logs.nginx',
        },
        where: {
          field: 'resource.attributes.host.name',
          eq: 'routeme',
        },
        status: 'enabled' as RoutingStatus,
      };
      // We use a forked stream as processing changes cannot be made to the root stream
      await forkStream(apiClient, 'logs', body);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('Place processing steps', async () => {
      const body: Streams.WiredStream.UpsertRequest = {
        ...emptyAssets,
        stream: {
          description: '',
          ingest: {
            lifecycle: { inherit: {} },
            settings: {},
            processing: {
              steps: [
                {
                  action: 'grok',
                  from: 'body.text',
                  patterns: [
                    '%{TIMESTAMP_ISO8601:attributes.inner_timestamp} %{LOGLEVEL:severity_text} %{GREEDYDATA:attributes.message2}',
                  ],
                  where: { always: {} },
                },
                {
                  action: 'dissect',
                  from: 'attributes.message2',
                  pattern: '%{attributes.log.logger} %{attributes.message3}',
                  where: {
                    field: 'severity_text',
                    eq: 'info',
                  },
                },
              ],
            },
            wired: {
              routing: [],
              fields: {
                'attributes.message2': {
                  type: 'match_only_text',
                },
              },
            },
            failure_store: { inherit: {} },
          },
        },
      };
      const response = await putStream(apiClient, 'logs.nginx', body);
      expect(response).to.have.property('acknowledged', true);
    });

    it('Index doc not matching condition', async () => {
      const doc = {
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
        ['host.name']: 'routeme',
      };
      const response = await indexDocument(esClient, 'logs', doc);
      expect(response.result).to.eql('created');

      const result = await fetchDocument(esClient, 'logs.nginx', response._id);
      expect(result._source).to.eql({
        '@timestamp': '2024-01-01T00:00:10.000Z',
        body: {
          text: '2023-01-01T00:00:10.000Z error test',
        },
        resource: {
          attributes: {
            'host.name': 'routeme',
          },
        },
        attributes: {
          inner_timestamp: '2023-01-01T00:00:10.000Z',
          message2: 'test',
        },
        severity_text: 'error',
        stream: { name: 'logs.nginx' },
      });
    });

    it('Index doc matching condition', async () => {
      const doc = {
        '@timestamp': '2024-01-01T00:00:11.000Z',
        message: '2023-01-01T00:00:10.000Z info mylogger this is the message',
        ['host.name']: 'routeme',
      };
      const response = await indexDocument(esClient, 'logs', doc);
      expect(response.result).to.eql('created');

      const result = await fetchDocument(esClient, 'logs.nginx', response._id);
      expect(result._source).to.eql({
        '@timestamp': '2024-01-01T00:00:11.000Z',
        body: {
          text: '2023-01-01T00:00:10.000Z info mylogger this is the message',
        },
        resource: {
          attributes: {
            'host.name': 'routeme',
          },
        },
        attributes: {
          inner_timestamp: '2023-01-01T00:00:10.000Z',
          'log.logger': 'mylogger',
          message2: 'mylogger this is the message',
          message3: 'this is the message',
        },
        severity_text: 'info',
        stream: { name: 'logs.nginx' },
      });
    });

    it('Doc is searchable', async () => {
      const response = await esClient.search({
        index: 'logs.nginx',
        query: {
          match: {
            'attributes.message2': 'mylogger',
          },
        },
      });
      expect((response.hits.total as SearchTotalHits).value).to.eql(1);
    });

    it('Non-indexed field is not searchable', async () => {
      const response = await esClient.search({
        index: 'logs.nginx',
        query: {
          match: {
            'attributes.log.logger': 'mylogger',
          },
        },
      });
      expect((response.hits.total as SearchTotalHits).value).to.eql(0);
    });
  });
}
