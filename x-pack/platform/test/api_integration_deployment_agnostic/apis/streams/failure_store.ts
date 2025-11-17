/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import type {
  EffectiveFailureStore,
  WiredIngestStreamEffectiveFailureStore,
} from '@kbn/streams-schema';
import { Streams, emptyAssets, isEnabledFailureStore } from '@kbn/streams-schema';
import { disableStreams, enableStreams, putStream, getStream } from './helpers/requests';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';

type DataStreamWithFailureStore = IndicesDataStream & {
  failure_store?: {
    enabled?: boolean;
    lifecycle?: {
      enabled?: boolean;
      data_retention?: string;
      effective_retention?: string;
      retention_determined_by?: 'default_failures_retention' | 'data_stream_configuration';
    };
  };
};

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  let apiClient: StreamsSupertestRepositoryClient;

  async function expectFailureStore(
    streams: string[],
    expectedFailureStore: EffectiveFailureStore | WiredIngestStreamEffectiveFailureStore
  ) {
    const definitions = await Promise.all(streams.map((stream) => getStream(apiClient, stream)));
    for (const definition of definitions) {
      const parsedDefinition = Streams.ingest.all.GetResponse.parse(definition);

      if (Streams.WiredStream.GetResponse.is(parsedDefinition)) {
        expect(parsedDefinition.effective_failure_store).to.eql(expectedFailureStore);
      } else if (Streams.ClassicStream.GetResponse.is(parsedDefinition)) {
        expect(parsedDefinition.effective_failure_store).to.eql(expectedFailureStore);
      }
    }

    const dataStreams = await esClient.indices.getDataStream({ name: streams });
    for (const dataStream of dataStreams.data_streams) {
      const expectedEnabled = isEnabledFailureStore(expectedFailureStore);
      expect(dataStream.failure_store?.enabled).to.eql(expectedEnabled);

      if (expectedEnabled && 'lifecycle' in expectedFailureStore) {
        const expectedRetention = expectedFailureStore.lifecycle.data_retention;
        if (expectedRetention) {
          const dsFailureStore =
            dataStream.failure_store as DataStreamWithFailureStore['failure_store'];
          expect(dsFailureStore?.lifecycle?.data_retention).to.eql(expectedRetention);
        }
      }
    }
  }

  describe('Failure Store', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    const wiredPutBody: Streams.WiredStream.UpsertRequest = {
      stream: {
        description: '',
        ingest: {
          lifecycle: { inherit: {} },
          settings: {},
          processing: { steps: [] },
          wired: { fields: {}, routing: [] },
          failure_store: { inherit: {} },
        },
      },
      ...emptyAssets,
    };

    describe('Wired streams failure store', () => {
      it('updates failure store configuration', async () => {
        const rootDefinition = await getStream(apiClient, 'logs');

        const response = await putStream(apiClient, 'logs', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...(rootDefinition as Streams.WiredStream.GetResponse).stream.ingest,
              failure_store: {
                lifecycle: { data_retention: '60d' },
              },
            },
          },
        });
        expect(response).to.have.property('acknowledged', true);

        const updatedRootDefinition = await getStream(apiClient, 'logs');
        expect(
          (updatedRootDefinition as Streams.WiredStream.GetResponse).stream.ingest.failure_store
        ).to.eql({
          enabled: true,
          lifecycle: { data_retention: '60d' },
        });

        await expectFailureStore(['logs'], {
          lifecycle: { data_retention: '60d' },
          from: 'logs',
        });
      });

      it('disables failure store', async () => {
        await putStream(apiClient, 'logs.disabled-fs', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...wiredPutBody.stream.ingest,
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: { disabled: {} },
            },
          },
        });

        await expectFailureStore(['logs.disabled-fs'], { disabled: {}, from: 'logs.disabled-fs' });
      });

      it('inherits failure store from parent on creation', async () => {
        const rootDefinition = await getStream(apiClient, 'logs');
        await putStream(apiClient, 'logs', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...(rootDefinition as Streams.WiredStream.GetResponse).stream.ingest,
              failure_store: {
                lifecycle: { data_retention: '45d' },
              },
            },
          },
        });

        await putStream(apiClient, 'logs.inherits-fs', wiredPutBody);

        // Child should inherit parent's failure store configuration
        await expectFailureStore(['logs.inherits-fs'], {
          lifecycle: { data_retention: '45d' },
          from: 'logs',
        });
      });

      it('inherits failure store configuration', async () => {
        await putStream(apiClient, 'logs.fs-inherits', wiredPutBody);
        await putStream(apiClient, 'logs.fs-inherits.child', wiredPutBody);

        await putStream(apiClient, 'logs.fs-overrides', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...wiredPutBody.stream.ingest,
              wired: {
                fields: {},
                routing: [
                  {
                    destination: 'logs.fs-overrides.child',
                    where: { never: {} },
                    status: 'disabled',
                  },
                ],
              },
              failure_store: {
                lifecycle: { data_retention: '15d' },
              },
            },
          },
        });
        await putStream(apiClient, 'logs.fs-overrides.child', wiredPutBody);

        const rootDefinition = await getStream(apiClient, 'logs');
        await putStream(apiClient, 'logs', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...(rootDefinition as Streams.WiredStream.GetResponse).stream.ingest,
              failure_store: {
                lifecycle: { data_retention: '90d' },
              },
            },
          },
        });

        // Inheriting streams should get root's config
        await expectFailureStore(['logs.fs-inherits', 'logs.fs-inherits.child'], {
          lifecycle: { data_retention: '90d' },
          from: 'logs',
        });

        // Overriding streams should keep their own config
        await expectFailureStore(['logs.fs-overrides', 'logs.fs-overrides.child'], {
          lifecycle: { data_retention: '15d' },
          from: 'logs.fs-overrides',
        });
      });

      it('applies the nearest parent failure store when reset to inherit', async () => {
        await putStream(apiClient, 'logs.fs-30d', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...wiredPutBody.stream.ingest,
              failure_store: {
                lifecycle: { data_retention: '30d' },
              },
            },
          },
        });
        await putStream(apiClient, 'logs.fs-30d.fs-60d', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...wiredPutBody.stream.ingest,
              failure_store: {
                lifecycle: { data_retention: '60d' },
              },
            },
          },
        });
        await putStream(apiClient, 'logs.fs-30d.fs-60d.inherits', wiredPutBody);

        await expectFailureStore(['logs.fs-30d.fs-60d.inherits'], {
          lifecycle: { data_retention: '60d' },
          from: 'logs.fs-30d.fs-60d',
        });

        await putStream(apiClient, 'logs.fs-30d.fs-60d', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...wiredPutBody.stream.ingest,
              wired: {
                fields: {},
                routing: [
                  {
                    destination: 'logs.fs-30d.fs-60d.inherits',
                    where: { never: {} },
                    status: 'disabled',
                  },
                ],
              },
              failure_store: { inherit: {} },
            },
          },
        });

        // All should now inherit from logs.fs-30d
        await expectFailureStore(
          ['logs.fs-30d', 'logs.fs-30d.fs-60d', 'logs.fs-30d.fs-60d.inherits'],
          {
            lifecycle: { data_retention: '30d' },
            from: 'logs.fs-30d',
          }
        );
      });

      it('can enable failure store with lifecycle', async () => {
        await putStream(apiClient, 'logs.fs-enabled-with-lifecycle', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...wiredPutBody.stream.ingest,
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: {
                lifecycle: { data_retention: '7d' },
              },
            },
          },
        });

        await expectFailureStore(['logs.fs-enabled-with-lifecycle'], {
          lifecycle: { data_retention: '7d' },
          from: 'logs.fs-enabled-with-lifecycle',
        });
      });

      it('updates failure store retention', async () => {
        const streamName = 'logs.fs-update-retention';
        await putStream(apiClient, streamName, {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...wiredPutBody.stream.ingest,
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: {
                lifecycle: { data_retention: '10d' },
              },
            },
          },
        });

        await expectFailureStore([streamName], {
          lifecycle: { data_retention: '10d' },
          from: streamName,
        });

        await putStream(apiClient, streamName, {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...wiredPutBody.stream.ingest,
              wired: {
                fields: {},
                routing: [],
              },
              failure_store: {
                lifecycle: { data_retention: '20d' },
              },
            },
          },
        });

        await expectFailureStore([streamName], {
          lifecycle: { data_retention: '20d' },
          from: streamName,
        });
      });
    });

    describe('Classic streams failure store', () => {
      const classicPutBody: Streams.ClassicStream.UpsertRequest = {
        stream: {
          description: '',
          ingest: {
            lifecycle: { inherit: {} },
            processing: { steps: [] },
            settings: {},
            classic: {},
            failure_store: { inherit: {} },
          },
        },
        ...emptyAssets,
      };

      let clean: () => Promise<void>;
      afterEach(() => clean?.());

      const createDataStream = async (
        name: string,
        failureStoreEnabled: boolean,
        failureStoreRetention?: string
      ) => {
        const template: any = {
          settings: {
            'index.default_pipeline': 'logs@default-pipeline',
          },
        };

        if (failureStoreEnabled) {
          template.failure_store = {
            enabled: true,
          };
          if (failureStoreRetention) {
            template.failure_store.lifecycle = {
              enabled: true,
              data_retention: failureStoreRetention,
            };
          }
        }

        await esClient.indices.putIndexTemplate({
          name,
          index_patterns: [name],
          data_stream: {},
          template,
        });
        await esClient.index({ index: name, document: { '@timestamp': new Date() } });

        clean = async () => {
          await esClient.indices.deleteDataStream({ name });
          await esClient.indices.deleteIndexTemplate({ name });
        };
      };

      it('inherit falls back to template failure store configuration', async () => {
        const indexName = 'classic-stream-inherit-fs';
        await createDataStream(indexName, true, '77d');

        await putStream(apiClient, indexName, classicPutBody);
        await expectFailureStore([indexName], { lifecycle: { data_retention: '77d' } });

        await putStream(apiClient, indexName, {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...classicPutBody.stream.ingest,
              failure_store: {
                lifecycle: { data_retention: '5d' },
              },
            },
          },
        });
        await expectFailureStore([indexName], { lifecycle: { data_retention: '5d' } });

        // Inherit sets the failure store back to the template configuration
        await putStream(apiClient, indexName, classicPutBody);
        await expectFailureStore([indexName], { lifecycle: { data_retention: '77d' } });
      });

      it('overrides failure store configuration', async () => {
        const indexName = 'classic-stream-override-fs';
        await createDataStream(indexName, true, '30d');

        await putStream(apiClient, indexName, {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...classicPutBody.stream.ingest,
              failure_store: {
                lifecycle: { data_retention: '10d' },
              },
            },
          },
        });

        await expectFailureStore([indexName], { lifecycle: { data_retention: '10d' } });
      });

      it('disables failure store on classic stream', async () => {
        const indexName = 'classic-stream-disable-fs';
        await createDataStream(indexName, true, '30d');

        await putStream(apiClient, indexName, {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...classicPutBody.stream.ingest,
              failure_store: { disabled: {} },
            },
          },
        });

        await expectFailureStore([indexName], { disabled: {} });
      });

      it('updates failure store retention on classic stream', async () => {
        const indexName = 'classic-stream-update-fs-retention';
        await createDataStream(indexName, true, '20d');

        await putStream(apiClient, indexName, {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...classicPutBody.stream.ingest,
              failure_store: {
                lifecycle: { data_retention: '7d' },
              },
            },
          },
        });

        await expectFailureStore([indexName], { lifecycle: { data_retention: '7d' } });

        await putStream(apiClient, indexName, {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...classicPutBody.stream.ingest,
              failure_store: {
                lifecycle: { data_retention: '30d' },
              },
            },
          },
        });

        await expectFailureStore([indexName], { lifecycle: { data_retention: '30d' } });
      });
    });

    describe('Root stream failure store', () => {
      it('does not allow inherit failure store on root', async () => {
        const rootDefinition = await getStream(apiClient, 'logs');

        await putStream(
          apiClient,
          'logs',
          {
            ...emptyAssets,
            stream: {
              description: '',
              ingest: {
                ...(rootDefinition as Streams.WiredStream.GetResponse).stream.ingest,
                failure_store: { inherit: {} },
              },
            },
          },
          400
        );
      });

      it('allows updating root stream failure store', async () => {
        const rootDefinition = await getStream(apiClient, 'logs');

        await putStream(apiClient, 'logs', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...(rootDefinition as Streams.WiredStream.GetResponse).stream.ingest,
              failure_store: {
                lifecycle: { data_retention: '120d' },
              },
            },
          },
        });

        const updatedDefinition = await getStream(apiClient, 'logs');
        expect(
          (updatedDefinition as Streams.WiredStream.GetResponse).stream.ingest.failure_store
        ).to.eql({
          enabled: true,
          lifecycle: { data_retention: '120d' },
        });
      });
    });
  });
}
