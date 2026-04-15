/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { BaseFeature } from '@kbn/streams-schema';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import {
  disableStreams,
  enableStreams,
  upsertFeature,
  listFeatures,
  bulkFeatures,
  deleteFeature,
} from './helpers/requests';

const STREAM_NAME = 'logs.otel';

const testFeature: BaseFeature = {
  id: 'test-feature',
  stream_name: STREAM_NAME,
  type: 'entity',
  subtype: 'service',
  title: 'Test Service',
  description: 'A test service for FTR tests',
  properties: { name: 'test-service' },
  confidence: 90,
  evidence: ['service.name=test-service'],
  tags: ['entity', 'service'],
};

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const kibanaServer = getService('kibanaServer');
  let apiClient: StreamsSupertestRepositoryClient;

  describe('Features', function () {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: true,
      });
    });

    after(async () => {
      await disableStreams(apiClient);
      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: false,
      });
    });

    describe('Exclude and restore', () => {
      it('creates a feature and lists it', async () => {
        const { uuid } = await upsertFeature(apiClient, STREAM_NAME, testFeature);
        expect(uuid).to.be.a('string');

        const { features } = await listFeatures(apiClient, STREAM_NAME);
        const found = features.find((f) => f.id === testFeature.id);
        expect(found).to.be.ok();
        expect(found!.uuid).to.eql(uuid);

        // Cleanup
        await deleteFeature(apiClient, STREAM_NAME, uuid);
      });

      it('excludes a feature via bulk and hides it from default list', async () => {
        const { uuid } = await upsertFeature(apiClient, STREAM_NAME, testFeature);

        // Exclude it
        await bulkFeatures(apiClient, STREAM_NAME, [{ exclude: { id: uuid } }]);

        // Should NOT appear in default list
        const { features } = await listFeatures(apiClient, STREAM_NAME);
        const found = features.find((f) => f.uuid === uuid);
        expect(found).to.be(undefined);

        // Cleanup
        await deleteFeature(apiClient, STREAM_NAME, uuid);
      });

      it('returns excluded features when include_excluded=true', async () => {
        const { uuid } = await upsertFeature(apiClient, STREAM_NAME, testFeature);

        await bulkFeatures(apiClient, STREAM_NAME, [{ exclude: { id: uuid } }]);

        // Should appear with include_excluded
        const { features } = await listFeatures(apiClient, STREAM_NAME, {
          includeExcluded: true,
        });
        const found = features.find((f) => f.uuid === uuid);
        expect(found).to.be.ok();
        expect(found!.excluded_at).to.be.a('string');

        // Cleanup
        await deleteFeature(apiClient, STREAM_NAME, uuid);
      });

      it('restores an excluded feature with fresh timestamps', async () => {
        const { uuid } = await upsertFeature(apiClient, STREAM_NAME, testFeature);

        await bulkFeatures(apiClient, STREAM_NAME, [{ exclude: { id: uuid } }]);

        // Restore it
        await bulkFeatures(apiClient, STREAM_NAME, [{ restore: { id: uuid } }]);

        // Should appear in default list again
        const { features } = await listFeatures(apiClient, STREAM_NAME);
        const found = features.find((f) => f.uuid === uuid);
        expect(found).to.be.ok();
        expect(found!.excluded_at).to.be(undefined);
        expect(found!.last_seen).to.be.a('string');
        expect(found!.expires_at).to.be.a('string');

        // Cleanup
        await deleteFeature(apiClient, STREAM_NAME, uuid);
      });

      it('bulk excludes multiple features and restores some', async () => {
        const feature1: BaseFeature = { ...testFeature, id: 'bulk-test-1' };
        const feature2: BaseFeature = { ...testFeature, id: 'bulk-test-2' };
        const feature3: BaseFeature = { ...testFeature, id: 'bulk-test-3' };

        const { uuid: uuid1 } = await upsertFeature(apiClient, STREAM_NAME, feature1);
        const { uuid: uuid2 } = await upsertFeature(apiClient, STREAM_NAME, feature2);
        const { uuid: uuid3 } = await upsertFeature(apiClient, STREAM_NAME, feature3);

        // Exclude all 3
        await bulkFeatures(apiClient, STREAM_NAME, [
          { exclude: { id: uuid1 } },
          { exclude: { id: uuid2 } },
          { exclude: { id: uuid3 } },
        ]);

        // Default list should have none of the 3
        const { features: afterExclude } = await listFeatures(apiClient, STREAM_NAME);
        expect(afterExclude.find((f) => f.uuid === uuid1)).to.be(undefined);
        expect(afterExclude.find((f) => f.uuid === uuid2)).to.be(undefined);
        expect(afterExclude.find((f) => f.uuid === uuid3)).to.be(undefined);

        // Restore 2 of them
        await bulkFeatures(apiClient, STREAM_NAME, [
          { restore: { id: uuid1 } },
          { restore: { id: uuid2 } },
        ]);

        const { features: afterRestore } = await listFeatures(apiClient, STREAM_NAME);
        expect(afterRestore.find((f) => f.uuid === uuid1)).to.be.ok();
        expect(afterRestore.find((f) => f.uuid === uuid2)).to.be.ok();
        expect(afterRestore.find((f) => f.uuid === uuid3)).to.be(undefined);

        // Cleanup
        await bulkFeatures(apiClient, STREAM_NAME, [
          { delete: { id: uuid1 } },
          { delete: { id: uuid2 } },
          { delete: { id: uuid3 } },
        ]);
      });

      it('hard deletes an excluded feature', async () => {
        const { uuid } = await upsertFeature(apiClient, STREAM_NAME, testFeature);

        await bulkFeatures(apiClient, STREAM_NAME, [{ exclude: { id: uuid } }]);

        // Hard delete
        await deleteFeature(apiClient, STREAM_NAME, uuid);

        // Should be gone entirely, even with include_excluded
        const { features } = await listFeatures(apiClient, STREAM_NAME, {
          includeExcluded: true,
        });
        const found = features.find((f) => f.uuid === uuid);
        expect(found).to.be(undefined);
      });
    });
  });
}
