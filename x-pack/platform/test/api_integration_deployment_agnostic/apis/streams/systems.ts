/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS } from '@kbn/management-settings-ids';
import type { System } from '@kbn/streams-schema';
import { emptyAssets } from '@kbn/streams-schema';
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

  describe('Systems', function () {
    const STREAM_NAME = 'logs.systems-test';

    const upsertSystem = async (body: System) => {
      return await apiClient.fetch('PUT /internal/streams/{name}/systems/{systemName}', {
        params: {
          path: { name: STREAM_NAME, systemName: body.name },
          body,
        },
      });
    };

    const listSystems = async (): Promise<System[]> => {
      const res = await apiClient.fetch('GET /internal/streams/{name}/systems', {
        params: { path: { name: STREAM_NAME } },
      });
      expect(res.status).to.be(200);
      return res.body.systems as System[];
    };

    const bulkOps = async (
      operations: Array<{ index: { system: System } } | { delete: { system: { name: string } } }>
    ) => {
      return await apiClient.fetch('POST /internal/streams/{name}/systems/_bulk', {
        params: {
          path: { name: STREAM_NAME },
          body: { operations },
        },
      });
    };

    const clearAllSystems = async () => {
      const systems = await listSystems();
      if (!systems.length) return;
      const operations = systems.map((system) => ({
        delete: { system: { name: system.name } },
      }));
      await bulkOps(operations);
    };

    before(async () => {
      await samlAuth.createM2mApiKeyWithRoleScope('admin');
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
      await kibanaServer.uiSettings.update({
        [OBSERVABILITY_STREAMS_ENABLE_SIGNIFICANT_EVENTS]: true,
      });

      // Create a basic wired stream to attach systems to
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

    describe('single system lifecycle', () => {
      beforeEach(async () => {
        const resp = await upsertSystem({
          name: 'feature-a',
          type: 'system',
          description: 'Initial description',
          filter: { always: {} },
        });
        expect(resp.status).to.be(200);
      });

      afterEach(async () => {
        await clearAllSystems();
      });

      it('gets and lists the system', async () => {
        const getResponse = await apiClient.fetch(
          'GET /internal/streams/{name}/systems/{systemName}',
          {
            params: {
              path: { name: STREAM_NAME, systemName: 'feature-a' },
            },
          }
        );
        expect(getResponse.status).to.be(200);
        expect(getResponse.body.system).to.eql({
          type: 'system',
          name: 'feature-a',
          description: 'Initial description',
          filter: { always: {} },
        });

        const systems = await listSystems();
        expect(systems).to.have.length(1);
        expect(systems[0]).to.eql({
          type: 'system',
          name: 'feature-a',
          description: 'Initial description',
          filter: { always: {} },
        });
      });

      it('cannot create a system with a name starting with an underscore', async () => {
        const resp = await upsertSystem({
          name: '_invalid-system',
          type: 'system',
          description: 'A system with an invalid name',
          filter: { always: {} },
        });
        expect(resp.status).to.be(400);
      });

      it('cannot create a system with a name starting with a dot', async () => {
        const resp = await upsertSystem({
          name: '.invalid-system',
          type: 'system',
          description: 'A system with an invalid name',
          filter: { always: {} },
        });
        expect(resp.status).to.be(400);
      });

      describe('after update', () => {
        beforeEach(async () => {
          const resp = await upsertSystem({
            name: 'feature-a',
            type: 'system',
            description: 'Updated description',
            filter: { field: 'message', contains: 'error' },
          });
          expect(resp.status).to.be(200);
        });

        it('reflects the updated system', async () => {
          const getUpdatedResponse = await apiClient.fetch(
            'GET /internal/streams/{name}/systems/{systemName}',
            {
              params: {
                path: { name: STREAM_NAME, systemName: 'feature-a' },
              },
            }
          );
          expect(getUpdatedResponse.status).to.be(200);
          expect(getUpdatedResponse.body.system).to.eql({
            type: 'system',
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
          {
            index: {
              system: { name: 's1', type: 'system', description: 'one', filter: { always: {} } },
            },
          },
          {
            index: {
              system: {
                name: 's2',
                type: 'system',
                description: 'two',
                filter: { field: 'message', contains: 'error' },
              },
            },
          },
        ]);
        expect(bulkCreate.status).to.be(200);
      });

      afterEach(async () => {
        await clearAllSystems();
      });

      it('lists newly indexed systems', async () => {
        const systems = await listSystems();
        expect(systems.map((s: System) => s.name).sort()).to.eql(['s1', 's2']);
      });

      describe('after delete and index via bulk', () => {
        beforeEach(async () => {
          const bulkModify = await bulkOps([
            { delete: { system: { name: 's1' } } },
            {
              index: {
                system: {
                  type: 'system',
                  name: 's3',
                  description: 'three',
                  filter: { field: 'host.name', eq: 'web-01' },
                },
              },
            },
          ]);
          expect(bulkModify.status).to.be(200);
        });

        it('lists updated set of systems', async () => {
          const systems = await listSystems();
          expect(systems.map((s: System) => s.name).sort()).to.eql(['s2', 's3']);
        });
      });
    });

    describe('systems are removed when stream is deleted', () => {
      beforeEach(async () => {
        const bulkCreate = await bulkOps([
          {
            index: {
              system: { name: 'sd1', type: 'system', description: 'one', filter: { always: {} } },
            },
          },
          {
            index: {
              system: { name: 'sd2', type: 'system', description: 'two', filter: { always: {} } },
            },
          },
        ]);
        expect(bulkCreate.status).to.be(200);
        const systems = await listSystems();
        expect(systems.map((s: System) => s.name).sort()).to.eql(['sd1', 'sd2']);
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
        await clearAllSystems();
      });

      it('deletes all system documents belonging to the stream', async () => {
        await deleteStream(apiClient, STREAM_NAME);

        // Verify via ES that no docs remain in the systems index for this stream
        await retry.tryForTime(10000, async () => {
          const res = await esClient.search({
            index: '.kibana_streams_systems',
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
        await clearAllSystems();
      });

      it('GET system returns 403', async () => {
        const res = await apiClient.fetch('GET /internal/streams/{name}/systems/{systemName}', {
          params: { path: { name: STREAM_NAME, systemName: 'nope' } },
        });
        expect(res.status).to.be(403);
      });

      it('DELETE system returns 403', async () => {
        const res = await apiClient.fetch('DELETE /internal/streams/{name}/systems/{systemName}', {
          params: { path: { name: STREAM_NAME, systemName: 'nope' } },
        });
        expect(res.status).to.be(403);
      });

      it('PUT system returns 403', async () => {
        const res = await apiClient.fetch('PUT /internal/streams/{name}/systems/{systemName}', {
          params: {
            path: { name: STREAM_NAME, systemName: 'nope' },
            body: { type: 'system', name: 'nope', description: 'x', filter: { always: {} } },
          },
        });
        expect(res.status).to.be(403);
      });

      it('GET systems list returns 403', async () => {
        const res = await apiClient.fetch('GET /internal/streams/{name}/systems', {
          params: { path: { name: STREAM_NAME } },
        });
        expect(res.status).to.be(403);
      });

      it('POST bulk returns 403', async () => {
        const res = await apiClient.fetch('POST /internal/streams/{name}/systems/_bulk', {
          params: {
            path: { name: STREAM_NAME },
            body: {
              operations: [
                {
                  index: {
                    system: {
                      name: 'a',
                      type: 'system',
                      description: 'A',
                      filter: { always: {} },
                    },
                  },
                },
                { delete: { system: { name: 'a' } } },
              ],
            },
          },
        });
        expect(res.status).to.be(403);
      });
    });
  });
}
