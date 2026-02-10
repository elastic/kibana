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
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { deleteStream, disableStreams, enableStreams, putStream } from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');

  let apiClient: StreamsSupertestRepositoryClient;
  const streamName = 'logs.missing_ds_ingest';

  describe('Ingest update - missing underlying data stream', function () {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);

      // Create a wired stream (not a classic fork) so that PUT .../_ingest uses the wired update path.
      await putStream(apiClient, streamName, {
        ...emptyAssets,
        stream: {
          description: '',
          ingest: {
            settings: {},
            processing: { steps: [] },
            lifecycle: { inherit: {} },
            wired: { fields: {}, routing: [] },
            failure_store: { inherit: {} },
          },
        },
      });

      // Simulate a corrupted/out-of-sync setup: stream definition exists but backing ES data stream is missing
      await esClient.indices.deleteDataStream({ name: streamName });
    });

    after(async () => {
      // Cleanup should tolerate the missing data stream.
      await deleteStream(apiClient, streamName);
      await disableStreams(apiClient);
    });

    it('returns 404 with a user-actionable message', async () => {
      const response = await apiClient.fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
        params: {
          path: { name: streamName },
          body: {
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {
                'index.refresh_interval': { value: '5s' },
              },
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: { inherit: {} },
            },
          },
        },
      });

      if (response.status !== 404) {
        throw new Error(
          `Expected 404 but got ${response.status}. Body: ${JSON.stringify(response.body)}`
        );
      }

      expect(response.body).to.have.property('statusCode', 404);
      expect(response.body).to.have.property('error', 'Not Found');
      expect(response.body.message).to.contain(
        `Elasticsearch data stream "${streamName}" does not exist`
      );
      expect(response.body.message).to.contain('resync API');
    });
  });
}
