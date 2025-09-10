/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { get } from 'lodash';
import { Streams } from '@kbn/streams-schema';
import type {
  IngestStreamSettings,
  WiredIngestStreamEffectiveSettings,
} from '@kbn/streams-schema/src/models/ingest/settings';
import { disableStreams, enableStreams, putStream, getStream } from './helpers/requests';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const config = getService('config');
  const isServerless = !!config.get('serverless');
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  let apiClient: StreamsSupertestRepositoryClient;

  async function updateDefinition(
    definition: Streams.ingest.all.GetResponse,
    settings: IngestStreamSettings
  ) {
    const request = {
      dashboards: [],
      queries: [],
      rules: [],
      stream: {
        description: '',
        ingest: {
          ...definition.stream.ingest,
          settings,
        },
      },
    };
    return await putStream(
      apiClient,
      definition.stream.name,
      request as Streams.ingest.all.UpsertRequest
    );
  }

  async function expectSettings(
    streams: string[],
    expectedSettings: IngestStreamSettings | WiredIngestStreamEffectiveSettings
  ) {
    const definitions = await Promise.all(streams.map((stream) => getStream(apiClient, stream)));
    for (const definition of definitions) {
      expect(Streams.ingest.all.GetResponse.parse(definition).effective_settings).to.eql(
        expectedSettings
      );
    }

    const dataStreams = await esClient.indices.getDataStreamSettings({ name: streams });
    for (const dataStream of dataStreams.data_streams) {
      Object.entries(expectedSettings).forEach(([key, expectedValue]) => {
        expect(get(dataStream.effective_settings, key)).to.eql(expectedValue.value);
      });
    }
  }

  describe('Settings', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('Wired streams update', () => {
      it('updates settings', async () => {
        const rootDefinition = await getStream(apiClient, 'logs');
        const response = await updateDefinition(rootDefinition as Streams.WiredStream.GetResponse, {
          'index.refresh_interval': { value: '10s' },
        });
        expect(response).to.have.property('acknowledged', true);

        await expectSettings(['logs'], {
          'index.refresh_interval': { value: '10s', from: 'logs' },
        });
      });

      it('inherits settings', async () => {
        await putStream(apiClient, 'logs.foo.bar', {
          dashboards: [],
          queries: [],
          rules: [],
          stream: {
            description: '',
            ingest: {
              settings: {},
              processing: { steps: [] },
              lifecycle: { inherit: {} },
              wired: { fields: {}, routing: [] },
            },
          },
        });

        await expectSettings(['logs', 'logs.foo', 'logs.foo.bar'], {
          'index.refresh_interval': { value: '10s', from: 'logs' },
        });

        const rootDefinition = await getStream(apiClient, 'logs');
        await updateDefinition(rootDefinition as Streams.WiredStream.GetResponse, {
          'index.refresh_interval': { value: '20s' },
        });

        await expectSettings(['logs', 'logs.foo', 'logs.foo.bar'], {
          'index.refresh_interval': { value: '20s', from: 'logs' },
        });
      });

      it('allows local overrides', async () => {
        await putStream(apiClient, 'logs.override', {
          dashboards: [],
          queries: [],
          rules: [],
          stream: {
            description: '',
            ingest: {
              settings: {
                'index.refresh_interval': { value: '30s' },
              },
              processing: { steps: [] },
              lifecycle: { inherit: {} },
              wired: { fields: {}, routing: [] },
            },
          },
        });

        await expectSettings(['logs.override'], {
          'index.refresh_interval': { value: '30s', from: 'logs.override' },
        });

        const rootDefinition = await getStream(apiClient, 'logs');
        await updateDefinition(rootDefinition as Streams.WiredStream.GetResponse, {
          'index.refresh_interval': { value: '40s' },
        });

        // override is preserved
        await expectSettings(['logs.override'], {
          'index.refresh_interval': { value: '30s', from: 'logs.override' },
        });
      });

      if (!isServerless) {
        it('allows all settings', async () => {
          await putStream(apiClient, 'logs.allsettings', {
            dashboards: [],
            queries: [],
            rules: [],
            stream: {
              description: '',
              ingest: {
                settings: {
                  'index.refresh_interval': { value: '30s' },
                  'index.number_of_shards': { value: 3 },
                  'index.number_of_replicas': { value: 2 },
                },
                processing: { steps: [] },
                lifecycle: { inherit: {} },
                wired: { fields: {}, routing: [] },
              },
            },
          });

          await expectSettings(['logs.allsettings'], {
            'index.refresh_interval': { value: '30s', from: 'logs.allsettings' },
            'index.number_of_shards': { value: 3, from: 'logs.allsettings' },
            'index.number_of_replicas': { value: 2, from: 'logs.allsettings' },
          });
        });
      }
    });

    describe('Classic streams update', () => {
      const name = 'logs-settings-overrides';
      before(async () => {
        await esClient.indices.createDataStream({ name });
      });

      after(async () => {
        await esClient.indices.deleteDataStream({ name });
      });

      it('updates settings', async () => {
        await putStream(apiClient, 'logs-settings-overrides', {
          dashboards: [],
          queries: [],
          rules: [],
          stream: {
            description: '',
            ingest: {
              settings: {
                'index.refresh_interval': { value: '30s' },
              },
              processing: { steps: [] },
              lifecycle: { inherit: {} },
              classic: {},
            },
          },
        });

        await expectSettings(['logs-settings-overrides'], {
          'index.refresh_interval': { value: '30s' },
        });

        const definition = await getStream(apiClient, 'logs-settings-overrides');
        await updateDefinition(definition as Streams.ClassicStream.GetResponse, {
          'index.refresh_interval': { value: '40s' },
        });

        await expectSettings(['logs-settings-overrides'], {
          'index.refresh_interval': { value: '40s' },
        });
      });
    });
  });
}
