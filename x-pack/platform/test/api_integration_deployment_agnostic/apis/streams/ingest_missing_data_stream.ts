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
import {
  deleteStream,
  disableStreams,
  enableStreams,
  putStream,
  restoreDataStream,
} from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');

  let apiClient: StreamsSupertestRepositoryClient;
  const streamName = 'logs.missing_ds_restore';

  describe('Restore data stream', function () {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);

      // Create a wired stream
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

    it('can restore the stream by recreating only the backing Elasticsearch data stream', async () => {
      await restoreDataStream(apiClient, streamName);

      const dsResponse = await esClient.indices.getDataStream({ name: streamName });
      expect(dsResponse.data_streams).to.have.length(1);
      expect(dsResponse.data_streams[0].name).to.be(streamName);
    });
  });
}
