/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { emptyAssets } from '@kbn/streams-schema';
import type { Streams } from '@kbn/streams-schema';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import {
  disableStreams,
  enableStreams,
  forkStream,
  getStream,
  putStream,
} from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;

  describe('Stream metadata', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('description', () => {
      it('should set a description for a stream', async () => {
        const body: Streams.WiredStream.UpsertRequest = {
          ...emptyAssets,
          stream: {
            description: 'This is a test stream',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: { inherit: {} },
            },
          },
        };
        await putStream(apiClient, 'logs.test', body, 200);

        const response = await getStream(apiClient, 'logs.test');
        expect(response.stream).to.have.property('description', 'This is a test stream');
      });

      it('should update a stream description', async () => {
        const body: Streams.WiredStream.UpsertRequest = {
          ...emptyAssets,
          stream: {
            description: 'Updated test stream description',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: { inherit: {} },
            },
          },
        };
        await putStream(apiClient, 'logs.test', body, 200);
        const response = await getStream(apiClient, 'logs.test');
        expect(response.stream).to.have.property('description', 'Updated test stream description');
      });
    });

    describe('updated_at', () => {
      it('should set an updated_at timestamp for a new stream', async () => {
        const body: Streams.WiredStream.UpsertRequest = {
          ...emptyAssets,
          stream: {
            description: 'This is a test stream',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: { inherit: {} },
            },
          },
        };
        await putStream(apiClient, 'logs.updated_at', body, 200);

        const response = await getStream(apiClient, 'logs.updated_at');
        expect(response.stream).to.have.property('updated_at');
      });

      it('should update the updated_at timestamp for existing streams', async () => {
        const oldStream = await getStream(apiClient, 'logs.updated_at');
        const oldUpdatedAt = oldStream.stream.updated_at;

        const body: Streams.WiredStream.UpsertRequest = {
          ...emptyAssets,
          stream: {
            description: 'This is a test stream',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: { inherit: {} },
            },
          },
        };
        await putStream(apiClient, 'logs.updated_at', body, 200);

        const response = await getStream(apiClient, 'logs.updated_at');
        expect(response.stream).to.have.property('updated_at');
        expect(response.stream.updated_at).to.not.equal(oldUpdatedAt);
      });

      it('should update the updated_at timestamp of the parent when a child stream is forked', async () => {
        const oldParent = await getStream(apiClient, 'logs.updated_at');
        const oldParentUpdatedAt = oldParent.stream.updated_at;

        await forkStream(
          apiClient,
          'logs.updated_at',
          { stream: { name: 'logs.updated_at.child' }, where: { always: {} }, status: 'enabled' },
          200
        );

        const updatedParent = await getStream(apiClient, 'logs.updated_at');
        expect(updatedParent.stream).to.have.property('updated_at');
        expect(updatedParent.stream.updated_at).to.not.equal(oldParentUpdatedAt);
      });
    });

    describe('ingest.processing.updated_at', () => {
      it('should set an ingest.processing.updated_at timestamp for a new stream', async () => {
        const body: Streams.WiredStream.UpsertRequest = {
          ...emptyAssets,
          stream: {
            description: 'This is a test stream',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: { inherit: {} },
            },
          },
        };
        await putStream(apiClient, 'logs.ingest.processing.updated_at', body, 200);

        const response = (await getStream(
          apiClient,
          'logs.ingest.processing.updated_at'
        )) as Streams.WiredStream.GetResponse;

        expect(response.stream.ingest.processing).to.have.property('updated_at');
      });

      it('should not update the timestamp for existing streams when processing does not change', async () => {
        const oldStream = (await getStream(
          apiClient,
          'logs.ingest.processing.updated_at'
        )) as Streams.WiredStream.GetResponse;
        const oldUpdatedAt = oldStream.stream.ingest.processing.updated_at;

        const body: Streams.WiredStream.UpsertRequest = {
          ...emptyAssets,
          stream: {
            description: 'This is a test stream',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: { inherit: {} },
            },
          },
        };
        await putStream(apiClient, 'logs.ingest.processing.updated_at', body, 200);

        const response = (await getStream(
          apiClient,
          'logs.ingest.processing.updated_at'
        )) as Streams.WiredStream.GetResponse;

        expect(response.stream.ingest.processing).to.have.property('updated_at');
        expect(response.stream.ingest.processing.updated_at).to.equal(oldUpdatedAt);
      });

      it('should update the timestamp for existing streams when processing does change', async () => {
        const oldStream = (await getStream(
          apiClient,
          'logs.ingest.processing.updated_at'
        )) as Streams.WiredStream.GetResponse;
        const oldUpdatedAt = oldStream.stream.ingest.processing.updated_at;

        const body: Streams.WiredStream.UpsertRequest = {
          ...emptyAssets,
          stream: {
            description: 'This is a test stream',
            ingest: {
              lifecycle: { inherit: {} },
              processing: {
                steps: [
                  {
                    action: 'set',
                    to: 'attributes.test',
                    value: 'test',
                  },
                ],
              },
              settings: {},
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: { inherit: {} },
            },
          },
        };
        await putStream(apiClient, 'logs.ingest.processing.updated_at', body, 200);

        const response = (await getStream(
          apiClient,
          'logs.ingest.processing.updated_at'
        )) as Streams.WiredStream.GetResponse;

        expect(response.stream.ingest.processing).to.have.property('updated_at');
        expect(response.stream.ingest.processing.updated_at).not.to.equal(oldUpdatedAt);
      });
    });
  });
}
