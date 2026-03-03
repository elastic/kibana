/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { BaseFeature, Feature } from '@kbn/streams-schema';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import { featureStorageSettings } from '@kbn/streams-plugin/server/lib/streams/feature/storage_settings';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { disableStreams, enableStreams } from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const kibanaServer = getService('kibanaServer');
  const samlAuth = getService('samlAuth');
  const esClient = getService('es');

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Features', function () {
    const STREAM_NAME = 'logs.otel';

    const createFeature = async (feature: BaseFeature, expectedStatusCode: number = 200) => {
      const res = await apiClient.fetch('POST /internal/streams/{name}/features', {
        params: {
          path: { name: STREAM_NAME },
          body: feature,
        },
      });
      expect(res.status).to.be(expectedStatusCode);
      return res.body;
    };

    const listFeatures = async (): Promise<Feature[]> => {
      const res = await apiClient.fetch('GET /internal/streams/{name}/features', {
        params: { path: { name: STREAM_NAME } },
      });
      expect(res.status).to.be(200);
      return res.body.features as Feature[];
    };

    const deleteFeature = async (uuid: string, expectedStatusCode: number = 200) => {
      const res = await apiClient.fetch('DELETE /internal/streams/{name}/features/{uuid}', {
        params: {
          path: { name: STREAM_NAME, uuid },
        },
      });
      expect(res.status).to.be(expectedStatusCode);
      return res.body;
    };

    before(async () => {
      await samlAuth.createM2mApiKeyWithRoleScope('admin');
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

    const testFeature: BaseFeature = {
      id: 'test-feature',
      stream_name: STREAM_NAME,
      type: 'entity',
      subtype: 'service',
      title: 'Test Feature',
      description: 'A feature created for testing',
      properties: { name: 'test-service' },
      confidence: 90,
      evidence: ['service.name=test-service'],
      tags: ['test'],
      meta: {},
    };

    describe('Soft delete', () => {
      it('soft-deleted feature should not appear in the features list but remain in the index', async () => {
        await createFeature(testFeature);

        const featuresBefore = await listFeatures();
        const created = featuresBefore.find((f) => f.id === testFeature.id);
        expect(created).to.be.ok();

        await deleteFeature(created!.uuid);

        const featuresAfter = await listFeatures();
        const deleted = featuresAfter.find((f) => f.id === testFeature.id);
        expect(deleted).to.be(undefined);

        const esResponse = await esClient.search({
          index: featureStorageSettings.name,
          query: {
            bool: {
              filter: [{ term: { 'feature.uuid': created!.uuid } }],
            },
          },
        });

        expect(esResponse.hits.hits.length).to.be(1);
        const storedDoc = esResponse.hits.hits[0]._source as Record<string, unknown>;
        expect(storedDoc['feature.deleted_at']).to.be.a('string');
        expect(storedDoc['feature.id']).to.be(testFeature.id);
      });

      it('deleting an already soft-deleted feature should return 404', async () => {
        await createFeature({ ...testFeature, id: 'test-double-delete' });

        const features = await listFeatures();
        const created = features.find((f) => f.id === 'test-double-delete');
        expect(created).to.be.ok();

        await deleteFeature(created!.uuid);
        await deleteFeature(created!.uuid, 404);
      });
    });
  });
}
