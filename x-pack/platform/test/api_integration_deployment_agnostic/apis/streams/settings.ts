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
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  let apiClient: StreamsSupertestRepositoryClient;

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

        const response = await putStream(apiClient, 'logs', {
          dashboards: [],
          queries: [],
          rules: [],
          stream: {
            description: '',
            ingest: {
              ...(rootDefinition as Streams.WiredStream.GetResponse).stream.ingest,
              settings: {
                'index.refresh_interval': { value: '10s' },
              },
            },
          },
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
              wired: {
                fields: {},
                routing: [],
              },
            },
          },
        });

        await expectSettings(['logs', 'logs.foo', 'logs.foo.bar'], {
          'index.refresh_interval': { value: '10s', from: 'logs' },
        });

        const rootDefinition = await getStream(apiClient, 'logs');

        await putStream(apiClient, 'logs', {
          dashboards: [],
          queries: [],
          rules: [],
          stream: {
            description: '',
            ingest: {
              ...(rootDefinition as Streams.WiredStream.GetResponse).stream.ingest,
              settings: {
                'index.refresh_interval': { value: '20s' },
              },
            },
          },
        });

        await expectSettings(['logs', 'logs.foo', 'logs.foo.bar'], {
          'index.refresh_interval': { value: '20s', from: 'logs' },
        });
      });
    });
  });
}
