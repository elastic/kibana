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

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const config = getService('config');
  const esClient = getService('es');
  let apiClient: StreamsSupertestRepositoryClient;
  let viewerApiClient: StreamsSupertestRepositoryClient;
  const isServerless = !!config.get('serverless');

  async function getFieldStatistics(
    client: StreamsSupertestRepositoryClient,
    name: string,
    expectStatusCode: number = 200
  ) {
    return client
      .fetch('GET /internal/streams/{name}/field_statistics', {
        params: {
          path: { name },
        },
      })
      .expect(expectStatusCode)
      .then((response) => response.body);
  }

  describe('Field statistics', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      viewerApiClient = await createStreamsRepositoryViewerClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    describe('GET /internal/streams/{name}/field_statistics', () => {
      if (isServerless) {
        it('returns isSupported: false in serverless', async () => {
          const response = await getFieldStatistics(viewerApiClient, 'logs');

          expect(response.isSupported).to.be(false);
          expect(response.fields).to.be.an('array');
          expect(response.fields).to.have.length(0);
          expect(response.totalFields).to.be(0);
        });
      } else {
        it('returns isSupported: true and field statistics in stateful', async () => {
          const response = await getFieldStatistics(viewerApiClient, 'logs');

          expect(response.isSupported).to.be(true);
          expect(response.fields).to.be.an('array');
          expect(response.totalFields).to.be.a('number');
        });

        it('returns 404 for non-existent stream', async () => {
          await getFieldStatistics(viewerApiClient, 'non-existent-stream', 404);
        });

        it('returns field statistics for a wired stream with documents', async () => {
          // Create a test stream
          const streamName = 'logs.field-stats-test';

          await putStream(apiClient, streamName, {
            ...emptyAssets,
            stream: {
              description: '',
              ingest: {
                lifecycle: { inherit: {} },
                processing: { steps: [] },
                settings: {},
                wired: {
                  fields: {
                    'attributes.test_field': {
                      type: 'keyword',
                    },
                  },
                  routing: [],
                },
                failure_store: { disabled: {} },
              },
            },
          });

          // Index some documents to generate field usage
          const now = Date.now();
          const timestamp = new Date(now).toISOString();

          await esClient.index({
            index: streamName,
            document: {
              '@timestamp': timestamp,
              'attributes.test_field': 'test-value-1',
            },
            refresh: 'wait_for',
          });

          await esClient.index({
            index: streamName,
            document: {
              '@timestamp': timestamp,
              'attributes.test_field': 'test-value-2',
            },
            refresh: 'wait_for',
          });

          // Execute a search to generate field usage stats
          await esClient.search({
            index: streamName,
            query: {
              bool: {
                filter: [{ term: { 'attributes.test_field': 'test-value-1' } }],
              },
            },
          });

          const response = await getFieldStatistics(viewerApiClient, streamName);

          expect(response.isSupported).to.be(true);
          expect(response.fields).to.be.an('array');
          expect(response.totalFields).to.be.a('number');
          expect(response.totalFields).to.be.greaterThan(0);

          // Each field should have the expected structure
          if (response.fields.length > 0) {
            const field = response.fields[0];
            expect(field).to.have.property('name');
            expect(field).to.have.property('any');
            expect(field).to.have.property('inverted_index');
            expect(field).to.have.property('stored_fields');
            expect(field).to.have.property('doc_values');
            expect(field).to.have.property('points');
            expect(field).to.have.property('norms');
            expect(field).to.have.property('term_vectors');
            expect(field).to.have.property('knn_vectors');

            expect(field.inverted_index).to.have.property('terms');
            expect(field.inverted_index).to.have.property('postings');
            expect(field.inverted_index).to.have.property('proximity');
            expect(field.inverted_index).to.have.property('positions');
            expect(field.inverted_index).to.have.property('term_frequencies');
            expect(field.inverted_index).to.have.property('offsets');
            expect(field.inverted_index).to.have.property('payloads');
          }

          // Clean up
          try {
            await apiClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
              params: { path: { name: streamName } },
            });
          } catch (e) {
            // Ignore cleanup errors
          }
        });

        it('returns fields sorted by usage (any) descending', async () => {
          const response = await getFieldStatistics(viewerApiClient, 'logs');

          expect(response.isSupported).to.be(true);
          expect(response.fields).to.be.an('array');

          // Verify fields are sorted by 'any' descending
          for (let i = 1; i < response.fields.length; i++) {
            expect(response.fields[i - 1].any).to.be.greaterThan(response.fields[i].any - 1);
          }
        });
      }
    });
  });
}
