/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Streams, emptyAssets, type RoutingStatus } from '@kbn/streams-schema';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { putStream, disableStreams, enableStreams, forkStream } from './helpers/requests';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;
  const esClient = getService('es');
  const status = 'enabled' as RoutingStatus;

  describe('conflicts', function () {
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
      // Can't test this on MKI because it's not possible to access the .kibana_streams index directly
      this.tags(['failsOnMKI']);
      before(async () => {
        apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
        await enableStreams(apiClient);
      });

      after(async () => {
        await disableStreams(apiClient);
      });

      it('should not treat a half-created wired stream as conflict', async () => {
        await putStream(
          apiClient,
          'logs.child',
          {
            stream: {
              description: '',
              ingest: {
                lifecycle: { dsl: {} },
                processing: { steps: [] },
                settings: {},
                wired: {
                  routing: [],
                  fields: {},
                },
              },
              updated_at: new Date().toISOString(),
            },
            ...emptyAssets,
          },
          200
        );
        // delete the tracking document so streams doesn't know anymore about the wired stream
        await esClient.delete({
          index: '.kibana_streams-000001',
          id: 'logs.child',
          refresh: 'wait_for',
        });

        // validate it doesn't show as a wired stream
        const streamsResponse = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: 'logs.child',
            },
          },
        });
        expect(Streams.WiredStream.GetResponse.is(streamsResponse.body)).to.be(false);

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
                lifecycle: { dsl: {} },
                processing: { steps: [] },
                settings: {},
                wired: {
                  routing: [],
                  fields: {},
                },
              },
              updated_at: new Date().toISOString(),
            },
            ...emptyAssets,
          },
          200
        );

        // validate it does show as a wired stream
        const streamsResponse2 = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: 'logs.child',
            },
          },
        });
        expect(Streams.WiredStream.GetResponse.is(streamsResponse2.body)).to.be(true);
      });
    });
  });
}
