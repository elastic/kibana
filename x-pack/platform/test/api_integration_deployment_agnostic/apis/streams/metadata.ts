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
import { disableStreams, enableStreams, getStream, putStream } from './helpers/requests';

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
}
