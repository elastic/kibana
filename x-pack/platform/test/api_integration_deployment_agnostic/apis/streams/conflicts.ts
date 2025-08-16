/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { RoutingStatus } from '@kbn/streams-schema';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import {
  indexDocument,
  putStream,
  disableStreams,
  enableStreams,
  forkStream,
} from './helpers/requests';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;
  const esClient = getService('es');
  const status = 'enabled' as RoutingStatus;

  // Failing: See https://github.com/elastic/kibana/issues/231906
  // Failing: See https://github.com/elastic/kibana/issues/231905
  describe.skip('conflicts', function () {
    describe('concurrency handling', function () {
      before(async () => {
        apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
        await enableStreams(apiClient);
      });

      after(async () => {
        await disableStreams(apiClient);
      });

      it('should not allow multiple requests manipulating streams state at once', async () => {
        const stream1 = {
          stream: {
            name: 'logs.nginx',
          },
          where: {
            field: 'resource.attributes.host.name',
            eq: 'routeme',
          },
          status,
        };
        const stream2 = {
          stream: {
            name: 'logs.apache',
          },
          where: {
            field: 'resource.attributes.host.name',
            eq: 'routeme2',
          },
          status,
        };
        const responses = await Promise.allSettled([
          forkStream(apiClient, 'logs', stream1),
          forkStream(apiClient, 'logs', stream2),
        ]);
        // Assert than one of the requests failed with a conflict error and the other succeeded
        // It needs to check either way (success or failure) because the order of execution is not guaranteed
        expect(responses).to.have.length(2);
        const successResponse = responses.find(
          (response) => response.status === 'fulfilled' && response.value.acknowledged
        );
        const conflictResponse = responses.find(
          (response) =>
            response.status === 'rejected' &&
            String(response.reason).toLowerCase().includes('conflict')
        );
        expect(successResponse).to.not.be(undefined);
        expect(conflictResponse).to.not.be(undefined);
      });
    });

    describe('classic/wired conflicts', function () {
      before(async () => {
        apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
        await enableStreams(apiClient);
        const doc = {
          message: '2023-01-01T00:00:10.000Z error test',
        };
        const response = await indexDocument(esClient, 'logs.existingindex', doc);
        expect(response.result).to.eql('created');
        // set up index template for logs.existingstream
        await esClient.indices.putIndexTemplate({
          name: 'logs.existingstream',
          index_patterns: ['logs.existingstream*'],
          data_stream: {},
          template: {
            mappings: {
              properties: {
                message: { type: 'text' },
              },
            },
          },
        });
        // create data stream logs.existingstream
        await esClient.indices.createDataStream({ name: 'logs.existingstream' });
      });

      after(async () => {
        await esClient.indices.delete({ index: 'logs.existingindex' });
        await esClient.indices.deleteDataStream({ name: 'logs.existingstream' });
        await esClient.indices.deleteIndexTemplate({ name: 'logs.existingstream' });
        await disableStreams(apiClient);
      });

      it('should not allow to create a wired stream with the same name as an existing index', async () => {
        const stream = {
          stream: { name: 'logs.existingindex' },
          where: {
            field: 'resource.attributes.host.name',
            eq: 'routeme',
          },
          status,
        };
        await forkStream(apiClient, 'logs', stream, 400);
      });

      it('should not allow to create a wired stream with the same name as an existing data stream', async () => {
        const stream = {
          stream: { name: 'logs.existingstream' },
          where: {
            field: 'resource.attributes.host.name',
            eq: 'routeme',
          },
          status,
        };
        await forkStream(apiClient, 'logs', stream, 409);
      });

      it('should not treat a half-created wired stream as conflict', async () => {
        await putStream(
          apiClient,
          'logs.child',
          {
            stream: {
              description: '',
              ingest: {
                lifecycle: {
                  dsl: {},
                },
                processing: {
                  steps: [
                    {
                      action: 'manual_ingest_pipeline',
                      processors: [
                        {
                          set: {
                            field: 'abc',
                            // this will cause the stream to be created halfway
                            break: true,
                          },
                        },
                      ],
                    },
                  ],
                },
                wired: {
                  routing: [],
                  fields: {},
                },
              },
            },
            queries: [],
            dashboards: [],
          },
          500
        );
        // Assert that the data stream was created
        const response = await esClient.indices.getDataStream({ name: 'logs.child' });
        expect(response.data_streams).to.have.length(1);
        // put stream again to fix the problem
        await putStream(
          apiClient,
          'logs.child',
          {
            stream: {
              description: '',
              ingest: {
                lifecycle: {
                  dsl: {},
                },
                processing: {
                  steps: [
                    {
                      action: 'manual_ingest_pipeline',
                      processors: [
                        {
                          set: {
                            field: 'abc',
                            value: true,
                          },
                        },
                      ],
                    },
                  ],
                },
                wired: {
                  routing: [],
                  fields: {},
                },
              },
            },
            queries: [],
            dashboards: [],
          },
          200
        );
      });
    });
  });
}
