/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { get } from 'lodash';
import { Streams, emptyAssets } from '@kbn/streams-schema';
import type {
  IngestStreamSettings,
  WiredIngestStreamEffectiveSettings,
} from '@kbn/streams-schema/src/models/ingest/settings';
import {
  disableStreams,
  enableStreams,
  putStream,
  getStream,
  deleteStream,
} from './helpers/requests';
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
      ...emptyAssets,
      stream: {
        ...definition.stream,
        name: undefined,
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
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              settings: {},
              processing: { steps: [] },
              lifecycle: { inherit: {} },
              wired: { fields: {}, routing: [] },
            },
            updated_at: new Date().toISOString(),
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
          ...emptyAssets,
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
            updated_at: new Date().toISOString(),
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
            ...emptyAssets,
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
              updated_at: new Date().toISOString(),
            },
          });

          await expectSettings(['logs.allsettings'], {
            'index.refresh_interval': { value: '30s', from: 'logs.allsettings' },
            'index.number_of_shards': { value: 3, from: 'logs.allsettings' },
            'index.number_of_replicas': { value: 2, from: 'logs.allsettings' },
          });
        });

        it('registers a rollover when updating number_of_shards', async () => {
          const rootDefinition = await getStream(apiClient, 'logs');
          await updateDefinition(rootDefinition as Streams.WiredStream.GetResponse, {
            'index.refresh_interval': { value: '7s' },
          });
          await esClient.index({
            index: 'logs',
            document: { '@timestamp': new Date().toISOString(), message: 'test' },
          });

          // no rollover when updating refresh_interval
          const {
            data_streams: [{ indices }],
          } = await esClient.indices.getDataStream({ name: 'logs' });
          expect(indices).to.have.length(1);

          await updateDefinition(rootDefinition as Streams.WiredStream.GetResponse, {
            'index.number_of_shards': { value: 2 },
            'index.refresh_interval': { value: '40s' },
          });
          await esClient.index({
            index: 'logs',
            document: { '@timestamp': new Date().toISOString(), message: 'test' },
          });

          const {
            data_streams: [{ indices: indicesAfterUpdate }],
          } = await esClient.indices.getDataStream({ name: 'logs' });
          expect(indicesAfterUpdate).to.have.length(2);
        });
      }
    });

    describe('Classic streams update', () => {
      const name = 'logs-settings-overrides';

      beforeEach(async () => {
        await esClient.indices.createDataStream({ name });
        await esClient.indices.putDataStreamSettings({
          name,
          settings: { 'index.refresh_interval': '20s' },
        });
      });

      afterEach(async () => {
        await deleteStream(apiClient, name);
      });

      async function upsertClassicStream(settings: IngestStreamSettings) {
        await putStream(apiClient, name, {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              settings,
              processing: { steps: [] },
              lifecycle: { inherit: {} },
              classic: {},
            },
          },
        });
      }

      it('updates settings', async () => {
        await upsertClassicStream({ 'index.refresh_interval': { value: '30s' } });
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

      if (!isServerless) {
        it('does not register a rollover when number_of_shards is not updated at creation', async () => {
          await esClient.indices.putDataStreamSettings({
            name,
            settings: { 'index.number_of_shards': 2 },
          });

          await upsertClassicStream({ 'index.number_of_shards': { value: 2 } });
          await esClient.index({
            index: name,
            document: { '@timestamp': new Date().toISOString(), message: 'test' },
          });

          const {
            data_streams: [{ indices }],
          } = await esClient.indices.getDataStream({ name });
          expect(indices).to.have.length(1);
        });

        it('registers a rollover when number_of_shards is updated at creation', async () => {
          await esClient.indices.putDataStreamSettings({
            name,
            settings: { 'index.number_of_shards': 2 },
          });

          await upsertClassicStream({ 'index.number_of_shards': { value: 3 } });

          await esClient.index({
            index: name,
            document: { '@timestamp': new Date().toISOString(), message: 'test' },
          });

          const {
            data_streams: [{ indices: indicesAfterUpdate }],
          } = await esClient.indices.getDataStream({ name });
          expect(indicesAfterUpdate).to.have.length(2);
        });

        it('registers a rollover when number_of_shards is updated', async () => {
          await esClient.indices.putDataStreamSettings({
            name,
            settings: { 'index.number_of_shards': 2 },
          });

          await upsertClassicStream({ 'index.number_of_shards': { value: 2 } });

          await esClient.index({
            index: name,
            document: { '@timestamp': new Date().toISOString(), message: 'test' },
          });

          const {
            data_streams: [{ indices }],
          } = await esClient.indices.getDataStream({ name });
          expect(indices).to.have.length(1);

          await upsertClassicStream({ 'index.number_of_shards': { value: 3 } });

          await esClient.index({
            index: name,
            document: { '@timestamp': new Date().toISOString(), message: 'test' },
          });

          const {
            data_streams: [{ indices: indicesAfterUpdate }],
          } = await esClient.indices.getDataStream({ name });
          expect(indicesAfterUpdate).to.have.length(2);
        });
      }
    });
  });
}
