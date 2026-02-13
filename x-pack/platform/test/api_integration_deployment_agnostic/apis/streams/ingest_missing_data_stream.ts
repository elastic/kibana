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
  getStream,
  putStream,
  restoreDataStream,
} from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Orphaned wired stream', function () {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('restoring', () => {
      const restoreStreamName = 'logs.orphaned_wired_restore';

      before(async () => {
        // Create a wired stream
        await putStream(apiClient, restoreStreamName, {
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

        // Simulate orphaned state: delete the backing ES data stream
        await esClient.indices.deleteDataStream({ name: restoreStreamName });
      });

      after(async () => {
        await deleteStream(apiClient, restoreStreamName);
      });

      it('can restore the stream by recreating only the backing Elasticsearch data stream', async () => {
        await restoreDataStream(apiClient, restoreStreamName);

        const dsResponse = await esClient.indices.getDataStream({ name: restoreStreamName });
        expect(dsResponse.data_streams).to.have.length(1);
        expect(dsResponse.data_streams[0].name).to.be(restoreStreamName);
      });
    });

    describe('deleting', () => {
      const deleteStreamName = 'logs.orphaned_wired_delete';

      before(async () => {
        // Create a wired stream
        await putStream(apiClient, deleteStreamName, {
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

        // Simulate orphaned state: delete the backing ES data stream
        await esClient.indices.deleteDataStream({ name: deleteStreamName });
      });

      it('can delete an orphaned wired stream when the backing data stream is missing', async () => {
        const response = await deleteStream(apiClient, deleteStreamName);
        expect(response).to.have.property('acknowledged', true);

        // Verify stream is actually deleted
        await getStream(apiClient, deleteStreamName, 404);
      });
    });
  });
}
