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
  FailureStore,
  WiredIngestStreamEffectiveFailureStore,
} from '@kbn/streams-schema';
import { Streams, emptyAssets, isEnabledFailureStore } from '@kbn/streams-schema';
import { omit } from 'lodash';
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
  const config = getService('config');
  const isServerless = !!config.get('serverless');
  let apiClient: StreamsSupertestRepositoryClient;

  async function updateFailureStore(streamName: string, failureStore: FailureStore) {
    const definition = await getStream(apiClient, streamName);
    const parsedDef = Streams.ingest.all.GetResponse.parse(definition);

    if (Streams.WiredStream.GetResponse.is(parsedDef)) {
      const request: Streams.WiredStream.UpsertRequest = {
        ...emptyAssets,
        stream: {
          description: parsedDef.stream.description || '',
          ingest: {
            ...parsedDef.stream.ingest,
            processing: omit(parsedDef.stream.ingest.processing, ['updated_at']),
            failure_store: failureStore,
          },
        },
      };
      return await putStream(apiClient, streamName, request);
    } else if (Streams.ClassicStream.GetResponse.is(parsedDef)) {
      const request: Streams.ClassicStream.UpsertRequest = {
        ...emptyAssets,
        stream: {
          description: parsedDef.stream.description || '',
          ingest: {
            ...parsedDef.stream.ingest,
            processing: omit(parsedDef.stream.ingest.processing, ['updated_at']),
            failure_store: failureStore,
          },
        },
      };
      return await putStream(apiClient, streamName, request);
    }
    throw new Error(`Unsupported stream type for ${streamName}`);
  }

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
        if ('enabled' in expectedFailureStore.lifecycle) {
          const expectedRetention = expectedFailureStore.lifecycle.enabled.data_retention;
          if (expectedRetention) {
            const dsFailureStore =
              dataStream.failure_store as DataStreamWithFailureStore['failure_store'];
            expect(dsFailureStore?.lifecycle?.data_retention).to.eql(expectedRetention);
          }
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
      // Reset root stream to a sensible default state before disabling streams
      // This ensures subsequent test files don't inherit a bad state if they run before cleanup
      try {
        await updateFailureStore('logs', {
          lifecycle: { enabled: { data_retention: '90d' } },
        });
      } catch (error) {
        // Ignore errors during cleanup
      }

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
              processing: omit(
                (rootDefinition as Streams.WiredStream.GetResponse).stream.ingest.processing,
                ['updated_at']
              ),
              failure_store: {
                lifecycle: { enabled: { data_retention: '60d' } },
              },
            },
          },
        });
        expect(response).to.have.property('acknowledged', true);

        const updatedRootDefinition = await getStream(apiClient, 'logs');
        const failureStore = (updatedRootDefinition as Streams.WiredStream.GetResponse).stream
          .ingest.failure_store;
        expect(failureStore).to.eql({
          lifecycle: { enabled: { data_retention: '60d' } },
        });

        await expectFailureStore(['logs'], {
          lifecycle: { enabled: { data_retention: '60d', is_default_retention: false } },
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
              processing: omit(
                (rootDefinition as Streams.WiredStream.GetResponse).stream.ingest.processing,
                ['updated_at']
              ),
              failure_store: {
                lifecycle: { enabled: { data_retention: '45d' } },
              },
            },
          },
        });

        await putStream(apiClient, 'logs.inherits-fs', wiredPutBody);

        // Child should inherit parent's failure store configuration
        await expectFailureStore(['logs.inherits-fs'], {
          lifecycle: { enabled: { data_retention: '45d', is_default_retention: false } },
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
                lifecycle: { enabled: { data_retention: '15d' } },
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
              processing: omit(
                (rootDefinition as Streams.WiredStream.GetResponse).stream.ingest.processing,
                ['updated_at']
              ),
              failure_store: {
                lifecycle: { enabled: { data_retention: '90d' } },
              },
            },
          },
        });

        // Inheriting streams should get root's config
        await expectFailureStore(['logs.fs-inherits', 'logs.fs-inherits.child'], {
          lifecycle: { enabled: { data_retention: '90d', is_default_retention: false } },
          from: 'logs',
        });

        // Overriding streams should keep their own config
        await expectFailureStore(['logs.fs-overrides', 'logs.fs-overrides.child'], {
          lifecycle: { enabled: { data_retention: '15d', is_default_retention: false } },
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
                lifecycle: { enabled: { data_retention: '30d' } },
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
                lifecycle: { enabled: { data_retention: '60d' } },
              },
            },
          },
        });
        await putStream(apiClient, 'logs.fs-30d.fs-60d.inherits', wiredPutBody);

        await expectFailureStore(['logs.fs-30d.fs-60d.inherits'], {
          lifecycle: { enabled: { data_retention: '60d', is_default_retention: false } },
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
            lifecycle: { enabled: { data_retention: '30d', is_default_retention: false } },
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
                lifecycle: { enabled: { data_retention: '7d' } },
              },
            },
          },
        });

        await expectFailureStore(['logs.fs-enabled-with-lifecycle'], {
          lifecycle: { enabled: { data_retention: '7d', is_default_retention: false } },
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
                lifecycle: { enabled: { data_retention: '10d' } },
              },
            },
          },
        });

        await expectFailureStore([streamName], {
          lifecycle: { enabled: { data_retention: '10d', is_default_retention: false } },
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
                lifecycle: { enabled: { data_retention: '20d' } },
              },
            },
          },
        });

        await expectFailureStore([streamName], {
          lifecycle: { enabled: { data_retention: '20d', is_default_retention: false } },
          from: streamName,
        });
      });

      it('disables lifecycle on failure store only for not serverless', async () => {
        const streamName = 'logs.fs-disabled-lifecycle';

        if (isServerless) {
          // In serverless, disabling failure store lifecycle is not allowed
          await putStream(
            apiClient,
            streamName,
            {
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
                    lifecycle: { disabled: {} },
                  },
                },
              },
            },
            400
          );
          return;
        }

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
                lifecycle: { disabled: {} },
              },
            },
          },
        });

        const definition = await getStream(apiClient, streamName);
        const parsedDefinition = Streams.WiredStream.GetResponse.parse(definition);

        expect(parsedDefinition.effective_failure_store).to.eql({
          lifecycle: { disabled: {} },
          from: streamName,
        });

        // Verify failure store is enabled but lifecycle is disabled
        const dataStreams = await esClient.indices.getDataStream({ name: [streamName] });
        expect(dataStreams.data_streams[0].failure_store?.enabled).to.eql(true);
      });

      it('inherits disabled lifecycle from parent only for not serverless', async () => {
        const parentStream = 'logs.parent-disabled-lifecycle';
        const childStream = 'logs.parent-disabled-lifecycle.child';

        if (isServerless) {
          // In serverless, disabling failure store lifecycle is not allowed
          await putStream(
            apiClient,
            parentStream,
            {
              ...emptyAssets,
              stream: {
                description: '',
                ingest: {
                  ...wiredPutBody.stream.ingest,
                  wired: {
                    fields: {},
                    routing: [
                      {
                        destination: childStream,
                        where: { never: {} },
                        status: 'disabled',
                      },
                    ],
                  },
                  failure_store: {
                    lifecycle: { disabled: {} },
                  },
                },
              },
            },
            400
          );
          return;
        }

        // Create parent with disabled lifecycle
        await putStream(apiClient, parentStream, {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...wiredPutBody.stream.ingest,
              wired: {
                fields: {},
                routing: [
                  {
                    destination: childStream,
                    where: { never: {} },
                    status: 'disabled',
                  },
                ],
              },
              failure_store: {
                lifecycle: { disabled: {} },
              },
            },
          },
        });

        // Create child that inherits
        await putStream(apiClient, childStream, wiredPutBody);

        // Both should have disabled lifecycle
        const parentDefinition = await getStream(apiClient, parentStream);
        const childDefinition = await getStream(apiClient, childStream);

        const parsedParent = Streams.WiredStream.GetResponse.parse(parentDefinition);
        const parsedChild = Streams.WiredStream.GetResponse.parse(childDefinition);

        expect(parsedParent.effective_failure_store).to.eql({
          lifecycle: { disabled: {} },
          from: parentStream,
        });

        expect(parsedChild.effective_failure_store).to.eql({
          lifecycle: { disabled: {} },
          from: parentStream,
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

      before(async () => {
        // Reset root stream to a known state before classic streams tests
        await updateFailureStore('logs', {
          disabled: {},
        });
      });

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
          data_stream_options: {
            failure_store: {
              enabled: failureStoreEnabled,
            },
          },
        };

        if (failureStoreEnabled && failureStoreRetention) {
          template.data_stream_options.failure_store.lifecycle = {
            enabled: true,
            data_retention: failureStoreRetention,
          };
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

      it('inherit defaults to disabled for classic streams without index template failure store configuration', async () => {
        const indexName = 'classic-stream-inherit-fs';
        await createDataStream(indexName, false);

        // Classic streams with inherit and no index template failure store configuration default to disabled failure store lifecycle
        await putStream(apiClient, indexName, classicPutBody);
        await expectFailureStore([indexName], {
          disabled: {},
        });

        // Can explicitly set failure store configuration
        await putStream(apiClient, indexName, {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...classicPutBody.stream.ingest,
              failure_store: {
                lifecycle: { enabled: { data_retention: '5d' } },
              },
            },
          },
        });
        await expectFailureStore([indexName], {
          lifecycle: { enabled: { data_retention: '5d', is_default_retention: false } },
        });

        // Inherit resets to default disabled state
        await putStream(apiClient, indexName, classicPutBody);
        await expectFailureStore([indexName], {
          disabled: {},
        });
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
                lifecycle: { enabled: { data_retention: '10d' } },
              },
            },
          },
        });

        await expectFailureStore([indexName], {
          lifecycle: { enabled: { data_retention: '10d', is_default_retention: false } },
        });
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
                lifecycle: { enabled: { data_retention: '7d' } },
              },
            },
          },
        });

        await expectFailureStore([indexName], {
          lifecycle: { enabled: { data_retention: '7d', is_default_retention: false } },
        });

        await putStream(apiClient, indexName, {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...classicPutBody.stream.ingest,
              failure_store: {
                lifecycle: { enabled: { data_retention: '30d' } },
              },
            },
          },
        });

        await expectFailureStore([indexName], {
          lifecycle: { enabled: { data_retention: '30d', is_default_retention: false } },
        });
      });

      it('disables lifecycle on classic stream failure store only for not serverless', async () => {
        const indexName = 'classic-stream-disabled-lifecycle';
        await createDataStream(indexName, true, '30d');

        if (isServerless) {
          // In serverless, disabling failure store lifecycle is not allowed
          await putStream(
            apiClient,
            indexName,
            {
              ...emptyAssets,
              stream: {
                description: '',
                ingest: {
                  ...classicPutBody.stream.ingest,
                  failure_store: {
                    lifecycle: { disabled: {} },
                  },
                },
              },
            },
            400
          );
          return;
        }

        await putStream(apiClient, indexName, {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...classicPutBody.stream.ingest,
              failure_store: {
                lifecycle: { disabled: {} },
              },
            },
          },
        });

        const definition = await getStream(apiClient, indexName);
        const parsedDefinition = Streams.ClassicStream.GetResponse.parse(definition);

        expect(parsedDefinition.effective_failure_store).to.eql({
          lifecycle: { disabled: {} },
        });

        // Verify failure store is enabled but lifecycle is disabled
        const dataStreams = await esClient.indices.getDataStream({ name: [indexName] });
        // @ts-expect-error IndicesDataStream not correctly typed
        expect(dataStreams.data_streams[0].failure_store?.lifecycle?.enabled).to.eql(false);
      });
    });

    describe('Root stream failure store', () => {
      it('allows updating root stream failure store', async () => {
        const rootDefinition = await getStream(apiClient, 'logs');

        await putStream(apiClient, 'logs', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...(rootDefinition as Streams.WiredStream.GetResponse).stream.ingest,
              processing: omit(
                (rootDefinition as Streams.WiredStream.GetResponse).stream.ingest.processing,
                ['updated_at']
              ),
              failure_store: {
                lifecycle: { enabled: { data_retention: '120d' } },
              },
            },
          },
        });

        const updatedDefinition = await getStream(apiClient, 'logs');
        const failureStore = (updatedDefinition as Streams.WiredStream.GetResponse).stream.ingest
          .failure_store;
        expect(failureStore).to.eql({
          lifecycle: { enabled: { data_retention: '120d' } },
        });
      });

      it('allows disabling lifecycle on root stream failure store only for not serverless', async () => {
        const rootDefinition = await getStream(apiClient, 'logs');

        if (isServerless) {
          // In serverless, disabling failure store lifecycle is not allowed
          await putStream(
            apiClient,
            'logs',
            {
              ...emptyAssets,
              stream: {
                description: '',
                ingest: {
                  ...(rootDefinition as Streams.WiredStream.GetResponse).stream.ingest,
                  processing: omit(
                    (rootDefinition as Streams.WiredStream.GetResponse).stream.ingest.processing,
                    ['updated_at']
                  ),
                  failure_store: {
                    lifecycle: { disabled: {} },
                  },
                },
              },
            },
            400
          );
          return;
        }

        await putStream(apiClient, 'logs', {
          ...emptyAssets,
          stream: {
            description: '',
            ingest: {
              ...(rootDefinition as Streams.WiredStream.GetResponse).stream.ingest,
              processing: omit(
                (rootDefinition as Streams.WiredStream.GetResponse).stream.ingest.processing,
                ['updated_at']
              ),
              failure_store: {
                lifecycle: { disabled: {} },
              },
            },
          },
        });

        const updatedDefinition = await getStream(apiClient, 'logs');
        const parsedDefinition = Streams.WiredStream.GetResponse.parse(updatedDefinition);

        const failureStore = parsedDefinition.stream.ingest.failure_store;
        expect(failureStore).to.eql({
          lifecycle: { disabled: {} },
        });

        expect(parsedDefinition.effective_failure_store).to.eql({
          lifecycle: { disabled: {} },
          from: 'logs',
        });

        // Verify failure store is enabled but lifecycle is disabled
        const dataStreams = await esClient.indices.getDataStream({ name: ['logs'] });
        expect(dataStreams.data_streams[0].failure_store?.enabled).to.eql(true);
      });
    });
  });
}
