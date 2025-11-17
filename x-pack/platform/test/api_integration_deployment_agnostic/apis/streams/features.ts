/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import { emptyAssets, type Feature } from '@kbn/streams-schema';
import type { Condition } from '@kbn/streamlang';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { disableStreams, enableStreams, putStream, deleteStream } from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const kibanaServer = getService('kibanaServer');
  const samlAuth = getService('samlAuth');
  const esClient = getService('es');
  const retry = getService('retry');

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Features', function () {
    const STREAM_NAME = 'logs.features-test';

    const createFeature = async (
      featureName: string,
      body: { description: string; filter: Condition }
    ) => {
      return await apiClient.fetch('PUT /internal/streams/{name}/features/{featureName}', {
        params: {
          path: { name: STREAM_NAME, featureName },
          body,
        },
      });
    };

    const updateFeature = async (
      featureName: string,
      body: { description: string; filter: Condition }
    ) => {
      return await apiClient.fetch('PUT /internal/streams/{name}/features/{featureName}', {
        params: {
          path: { name: STREAM_NAME, featureName },
          body,
        },
      });
    };

    const listFeatures = async (): Promise<Feature[]> => {
      const res = await apiClient.fetch('GET /internal/streams/{name}/features', {
        params: { path: { name: STREAM_NAME } },
      });
      expect(res.status).to.be(200);
      return res.body.features as Feature[];
    };

    const bulkOps = async (
      operations: Array<{ index: { feature: Feature } } | { delete: { feature: { name: string } } }>
    ) => {
      return await apiClient.fetch('POST /internal/streams/{name}/features/_bulk', {
        params: {
          path: { name: STREAM_NAME },
          body: { operations },
        },
      });
    };

    const clearAllFeatures = async () => {
      const features = await listFeatures();
      if (!features.length) return;
      const operations = features.map((s) => ({ delete: { feature: { name: s.name } } }));
      await bulkOps(operations);
    };

    before(async () => {
      await samlAuth.createM2mApiKeyWithRoleScope('admin');
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: true,
      });

      // Create a basic wired stream to attach features to
      await putStream(apiClient, STREAM_NAME, {
        stream: {
          description: '',
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [] },
            wired: { routing: [], fields: {} },
            settings: {},
            failure_store: { inherit: {} },
          },
        },
        ...emptyAssets,
      });
    });

    after(async () => {
      await disableStreams(apiClient);
      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: false,
      });
    });

    describe('single feature lifecycle', () => {
      beforeEach(async () => {
        const resp = await createFeature('feature-a', {
          description: 'Initial description',
          filter: { always: {} },
        });
        expect(resp.status).to.be(200);
      });

      afterEach(async () => {
        await clearAllFeatures();
      });

      it('gets and lists the feature', async () => {
        const getResponse = await apiClient.fetch(
          'GET /internal/streams/{name}/features/{featureName}',
          {
            params: { path: { name: STREAM_NAME, featureName: 'feature-a' } },
          }
        );
        expect(getResponse.status).to.be(200);
        expect(getResponse.body.feature).to.eql({
          name: 'feature-a',
          description: 'Initial description',
          filter: { always: {} },
        });

        const features = await listFeatures();
        expect(features).to.have.length(1);
        expect(features[0]).to.eql({
          name: 'feature-a',
          description: 'Initial description',
          filter: { always: {} },
        });
      });

      it('cannot create a feature with a name starting with an underscore', async () => {
        const resp = await createFeature('_invalid-feature', {
          description: 'A feature with an invalid name',
          filter: { always: {} },
        });
        expect(resp.status).to.be(400);
      });

      it('cannot create a feature with a name starting with a dot', async () => {
        const resp = await createFeature('.invalid-feature', {
          description: 'A feature with an invalid name',
          filter: { always: {} },
        });
        expect(resp.status).to.be(400);
      });

      describe('after update', () => {
        beforeEach(async () => {
          const resp = await updateFeature('feature-a', {
            description: 'Updated description',
            filter: { field: 'message', contains: 'error' },
          });
          expect(resp.status).to.be(200);
        });

        it('reflects the updated feature', async () => {
          const getUpdatedResponse = await apiClient.fetch(
            'GET /internal/streams/{name}/features/{featureName}',
            {
              params: { path: { name: STREAM_NAME, featureName: 'feature-a' } },
            }
          );
          expect(getUpdatedResponse.status).to.be(200);
          expect(getUpdatedResponse.body.feature).to.eql({
            name: 'feature-a',
            description: 'Updated description',
            filter: { field: 'message', contains: 'error' },
          });
        });
      });
    });

    describe('bulk operations', () => {
      beforeEach(async () => {
        const bulkCreate = await bulkOps([
          { index: { feature: { name: 's1', description: 'one', filter: { always: {} } } } },
          {
            index: {
              feature: {
                name: 's2',
                description: 'two',
                filter: { field: 'message', contains: 'error' },
              },
            },
          },
        ]);
        expect(bulkCreate.status).to.be(200);
      });

      afterEach(async () => {
        await clearAllFeatures();
      });

      it('lists newly indexed features', async () => {
        const features = await listFeatures();
        expect(features.map((f: Feature) => f.name).sort()).to.eql(['s1', 's2']);
      });

      describe('after delete and index via bulk', () => {
        beforeEach(async () => {
          const bulkModify = await bulkOps([
            { delete: { feature: { name: 's1' } } },
            {
              index: {
                feature: {
                  name: 's3',
                  description: 'three',
                  filter: { field: 'host.name', eq: 'web-01' },
                },
              },
            },
          ]);
          expect(bulkModify.status).to.be(200);
        });

        it('lists updated set of features', async () => {
          const features = await listFeatures();
          expect(features.map((f: Feature) => f.name).sort()).to.eql(['s2', 's3']);
        });
      });
    });

    describe('features are removed when stream is deleted', () => {
      beforeEach(async () => {
        const bulkCreate = await bulkOps([
          { index: { feature: { name: 'sd1', description: 'one', filter: { always: {} } } } },
          { index: { feature: { name: 'sd2', description: 'two', filter: { always: {} } } } },
        ]);
        expect(bulkCreate.status).to.be(200);
        const features = await listFeatures();
        expect(features.map((f: Feature) => f.name).sort()).to.eql(['sd1', 'sd2']);
      });

      afterEach(async () => {
        // Recreate the stream for subsequent tests
        await putStream(apiClient, STREAM_NAME, {
          stream: {
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              wired: { routing: [], fields: {} },
              settings: {},
              failure_store: { inherit: {} },
            },
          },
          ...emptyAssets,
        });
        await clearAllFeatures();
      });

      it('deletes all feature documents belonging to the stream', async () => {
        await deleteStream(apiClient, STREAM_NAME);

        // Verify via ES that no docs remain in the features index for this stream
        await retry.tryForTime(10000, async () => {
          const res = await esClient.search({
            index: '.kibana_streams_systems', // Initially features were called systems
            size: 0,
            track_total_hits: true,
            query: { term: { 'stream.name': STREAM_NAME } },
          });
          const totalVal = res.hits.total
            ? typeof res.hits.total === 'number'
              ? res.hits.total
              : res.hits.total.value
            : 0;
          expect(totalVal).to.be(0);
        });
      });
    });

    describe('requires significant events setting', () => {
      beforeEach(async () => {
        await kibanaServer.uiSettings.update({
          [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: false,
        });
      });

      afterEach(async () => {
        await kibanaServer.uiSettings.update({
          [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: true,
        });
        await clearAllFeatures();
      });

      it('GET feature returns 403', async () => {
        const res = await apiClient.fetch('GET /internal/streams/{name}/features/{featureName}', {
          params: { path: { name: STREAM_NAME, featureName: 'nope' } },
        });
        expect(res.status).to.be(403);
      });

      it('DELETE feature returns 403', async () => {
        const res = await apiClient.fetch(
          'DELETE /internal/streams/{name}/features/{featureName}',
          {
            params: { path: { name: STREAM_NAME, featureName: 'nope' } },
          }
        );
        expect(res.status).to.be(403);
      });

      it('PUT feature returns 403', async () => {
        const res = await apiClient.fetch('PUT /internal/streams/{name}/features/{featureName}', {
          params: {
            path: { name: STREAM_NAME, featureName: 'nope' },
            body: { description: 'x', filter: { always: {} } },
          },
        });
        expect(res.status).to.be(403);
      });

      it('GET features list returns 403', async () => {
        const res = await apiClient.fetch('GET /internal/streams/{name}/features', {
          params: { path: { name: STREAM_NAME } },
        });
        expect(res.status).to.be(403);
      });

      it('POST bulk returns 403', async () => {
        const res = await apiClient.fetch('POST /internal/streams/{name}/features/_bulk', {
          params: {
            path: { name: STREAM_NAME },
            body: {
              operations: [
                { index: { feature: { name: 'a', description: 'A', filter: { always: {} } } } },
                { delete: { feature: { name: 'a' } } },
              ],
            },
          },
        });
        expect(res.status).to.be(403);
      });
    });
  });
}
