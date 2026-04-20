/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FieldDefinition, RoutingStatus } from '@kbn/streams-schema';
import {
  LOGS_ECS_STREAM_NAME,
  LOGS_OTEL_STREAM_NAME,
  Streams,
  emptyAssets,
} from '@kbn/streams-schema';
import { MAX_PRIORITY } from '@kbn/streams-plugin/server/lib/streams/index_templates/generate_index_template';
import type { InheritedFieldDefinition } from '@kbn/streams-schema/src/fields';
import { OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS } from '@kbn/management-settings-ids';
import { get, omit } from 'lodash';
import type { JsonObject } from '@kbn/utility-types';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import {
  createStreamsRepositoryAdminClient,
  createStreamsRepositoryViewerClient,
} from './helpers/repository_client';
import {
  deleteStream,
  disableStreams,
  enableStreams,
  fetchDocument,
  forkStream,
  getStream,
  indexAndAssertTargetStream,
  indexDocument,
  putStream,
} from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;
  let viewerApiClient: StreamsSupertestRepositoryClient;
  const config = getService('config');
  const retry = getService('retry');
  const isServerless = !!config.get('serverless');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const status = 'enabled' as RoutingStatus;

  interface Resources {
    indices: string[];
    componentTemplates: string[];
    indexTemplates: string[];
  }

  function getResources(): Promise<Resources> {
    return Promise.all([
      esClient.indices.get({
        index: ['logs*'],
        allow_no_indices: true,
      }),
      esClient.cluster.getComponentTemplate({
        name: 'logs*',
      }),
      esClient.indices.getIndexTemplate({
        name: 'logs*',
      }),
    ]).then(([indicesResponse, componentTemplateResponse, indexTemplateResponse]) => {
      return {
        indices: Object.keys(indicesResponse.indices ?? {}),
        componentTemplates: componentTemplateResponse.component_templates.map(
          (template) => template.name
        ),
        indexTemplates: indexTemplateResponse.index_templates.map((template) => template.name),
      };
    });
  }

  /** ES assets installed for wired roots (see getComponentTemplateName / getIndexTemplateName). */
  const WIRED_ROOT_ELASTICSEARCH_ASSETS = [
    `${LOGS_OTEL_STREAM_NAME}@stream.layer`,
    `${LOGS_ECS_STREAM_NAME}@stream.layer`,
    `${LOGS_OTEL_STREAM_NAME}@stream`,
    `${LOGS_ECS_STREAM_NAME}@stream`,
  ];

  function resourcesExcludingWiredRootAssets(r: Resources): Resources {
    const exclude = new Set(WIRED_ROOT_ELASTICSEARCH_ASSETS);
    return {
      indices: r.indices,
      componentTemplates: r.componentTemplates.filter((name) => !exclude.has(name)),
      indexTemplates: r.indexTemplates.filter((name) => !exclude.has(name)),
    };
  }

  /** ES APIs do not guarantee stable ordering; normalize before deep equality checks. */
  function sortResourceLists(r: Resources): Resources {
    return {
      indices: [...r.indices].sort((a, b) => a.localeCompare(b)),
      componentTemplates: [...r.componentTemplates].sort((a, b) => a.localeCompare(b)),
      indexTemplates: [...r.indexTemplates].sort((a, b) => a.localeCompare(b)),
    };
  }

  describe('Basic functionality', () => {
    async function getWiredStatus() {
      const response = await viewerApiClient.fetch('GET /api/streams/_status').expect(200);
      return response.body;
    }

    // Tracks whether the ES|QL views API is available in the current test environment.
    // The API is only available in stateful (non-serverless) Elasticsearch and only in
    // recent-enough versions. When unavailable, view-specific assertions are skipped.
    let viewsApiAvailable = false;

    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      viewerApiClient = await createStreamsRepositoryViewerClient(roleScopedSupertest);
      if (!isServerless) {
        // Probe whether the ES|QL views API exists. A 404 means the endpoint
        // exists but the view resource was not found – i.e. the API is available.
        // Any other error (e.g. 400/405) indicates the API is not yet supported.
        viewsApiAvailable = await esClient.transport
          .request({ method: 'GET', path: '/_query/view/__kibana_probe__' })
          .then(() => true)
          .catch((err: { statusCode?: number }) => err?.statusCode === 404);

        if (viewsApiAvailable) {
          await kibanaServer.uiSettings.update({
            [OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS]: true,
          });
        }
      }
    });

    after(async () => {
      if (!isServerless && viewsApiAvailable) {
        await kibanaServer.uiSettings.update({
          [OBSERVABILITY_STREAMS_ENABLE_WIRED_STREAM_VIEWS]: false,
        });
      }
    });

    describe('initially', () => {
      let resources: Resources;

      before(async () => {
        resources = await getResources();
      });

      it('is enabled by default', async () => {
        // Wired roots may be enabled asynchronously after Kibana starts; poll until status settles.
        await retry.tryForTime(
          120_000,
          async () => {
            const wiredStatus = await getWiredStatus();
            expect(wiredStatus.logs).to.eql(false);
            expect(wiredStatus['logs.otel']).to.eql(true);
            expect(wiredStatus['logs.ecs']).to.eql(true);
          },
          undefined,
          500
        );
      });

      it(`does not materialize backing data streams for wired root streams`, async () => {
        for (const streamName of ['logs.ecs', 'logs.otel']) {
          await esClient.indices.getDataStream({ name: streamName }).then(
            () => {
              throw new Error(`Expected ${streamName} data stream to not exist`);
            },
            (err) => {
              expect(err.meta?.body?.error?.type).to.eql('index_not_found_exception');
            }
          );
        }
      });

      describe('after enabling', () => {
        before(async () => {
          // need to disable and enable streams to ensure the views setting is picked up
          await retry.tryForTime(
            120_000,
            async () => {
              await disableStreams(apiClient);
            },
            undefined,
            500
          );
          await retry.tryForTime(
            120_000,
            async () => {
              await enableStreams(apiClient);
            },
            undefined,
            500
          );
        });

        it('reports enabled status', async () => {
          const wiredStatus = await getWiredStatus();
          expect(wiredStatus.logs).to.eql(false);
          expect(wiredStatus['logs.otel']).to.eql(true);
          expect(wiredStatus['logs.ecs']).to.eql(true);
        });

        it(`materializes backing data streams for wired root streams`, async () => {
          for (const streamName of ['logs.ecs', 'logs.otel']) {
            const response = await esClient.indices.getDataStream({ name: streamName });
            expect(response.data_streams).to.have.length(1);
            expect(response.data_streams[0].name).to.be(streamName);
          }
        });

        it('includes create_snapshot_repository in stream privileges', async () => {
          const stream = await getStream(apiClient, 'logs.otel');
          const parsed = Streams.WiredStream.GetResponse.parse(stream);
          expect(typeof parsed.privileges.create_snapshot_repository).to.eql('boolean');
        });

        // ES|QL views API is not available in all environments
        if (!isServerless) {
          it('creates ES|QL views for wired root streams', async () => {
            if (!viewsApiAvailable) return;
            await retry.tryForTime(
              120_000,
              async () => {
                for (const streamName of ['logs.otel', 'logs.ecs']) {
                  const response = await esClient.transport.request<{
                    views: Array<{ name: string; query: string }>;
                  }>({
                    method: 'GET',
                    path: `/_query/view/%24.${streamName}`,
                  });
                  expect(response.views).to.have.length(1);
                  expect(response.views[0].name).to.eql(`$.${streamName}`);
                  expect(response.views[0].query).to.eql(`FROM ${streamName}`);
                }
              },
              undefined,
              500
            );
          });
        }

        // Elasticsearch doesn't support streams in serverless mode yet
        if (!isServerless) {
          it('reports conflict if disabled on Elasticsearch level', async () => {
            await esClient.transport.request({
              method: 'POST',
              path: '/_streams/logs.otel/_disable',
            });
            const wiredStatus = await getWiredStatus();
            expect(wiredStatus['logs.otel']).to.eql('conflict');
            expect(wiredStatus['logs.ecs']).to.eql(true);
            expect(wiredStatus.logs).to.eql(false);
          });

          it('reports enabled after calling enabled again', async () => {
            await enableStreams(apiClient);
            const wiredStatus = await getWiredStatus();
            expect(wiredStatus.logs).to.eql(false);
            expect(wiredStatus['logs.otel']).to.eql(true);
            expect(wiredStatus['logs.ecs']).to.eql(true);
          });

          it('Elasticsearch streams is enabled too', async () => {
            type StreamsStatusResponse = {
              logs: { enabled: boolean } & Record<string, unknown>;
            } & Record<string, unknown>;

            const response = await esClient.transport.request<StreamsStatusResponse>({
              method: 'GET',
              path: '/_streams/status',
            });
            expect(response).to.eql({
              logs: {
                enabled: false,
              },
              'logs.otel': {
                enabled: true,
              },
              'logs.ecs': {
                enabled: true,
              },
            });
          });
        }

        it('disables streams', async () => {
          await disableStreams(apiClient);
        });

        describe('after disabling', () => {
          before(async () => {
            await disableStreams(apiClient);
          });

          it('cleans up all the resources', async () => {
            const afterDisable = await getResources();
            // Wired roots are on by default, so the initial snapshot includes their index and
            // component templates; disableStreams removes them. Everything else should match.
            expect(sortResourceLists(resourcesExcludingWiredRootAssets(afterDisable))).to.eql(
              sortResourceLists(resourcesExcludingWiredRootAssets(resources))
            );
            const templateNames = [
              ...afterDisable.componentTemplates,
              ...afterDisable.indexTemplates,
            ];
            for (const name of WIRED_ROOT_ELASTICSEARCH_ASSETS) {
              expect(templateNames.includes(name)).to.eql(false);
            }
          });

          it('returns a 404 for logs', async () => {
            await apiClient
              .fetch('GET /api/streams/{name} 2023-10-31', {
                params: {
                  path: {
                    name: 'logs',
                  },
                },
              })
              .expect(404);
          });

          it('is disabled', async () => {
            const wiredStatus = await getWiredStatus();
            expect(wiredStatus.logs).to.eql(false);
            expect(wiredStatus['logs.otel']).to.eql(false);
            expect(wiredStatus['logs.ecs']).to.eql(false);
          });

          // ES|QL views API is not available in all environments
          if (!isServerless) {
            it('removes ES|QL views for wired root streams', async () => {
              if (!viewsApiAvailable) return;
              for (const streamName of ['logs.otel', 'logs.ecs']) {
                await esClient.transport
                  .request<{ views: Array<{ name: string; query: string }> }>({
                    method: 'GET',
                    path: `/_query/view/%24.${streamName}`,
                  })
                  .then(
                    () => {
                      throw new Error(`Expected view $.${streamName} to be deleted`);
                    },
                    (err: { statusCode?: number }) => {
                      expect(err.statusCode).to.eql(404);
                    }
                  );
              }
            });
          }
        });
      });
    });

    // Note: Each step is dependent on the previous
    describe('Full flow for logs.otel', () => {
      const rootStream = 'logs.otel';

      before(async () => {
        await enableStreams(apiClient);
      });

      after(async () => {
        await disableStreams(apiClient);
      });

      it(`Index a JSON document to ${rootStream}, should go to ${rootStream}`, async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          message: JSON.stringify({
            '@timestamp': '2024-01-01T00:00:00.000Z',
            'log.level': 'info',
            'log.logger': 'nginx',
            message: 'test',
          }),
        };
        const response = await indexDocument(esClient, rootStream, doc);
        expect(response.result).to.eql('created');
        const result = await fetchDocument(esClient, rootStream, response._id);
        expect(result._index).to.match(new RegExp(`^\\.ds\\-${rootStream.replace('.', '\\.')}-.*`));
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:00.000Z',
          body: {
            text: 'test',
          },
          severity_text: 'info',
          attributes: { 'log.logger': 'nginx' },
          stream: { name: rootStream },
        });
      });

      it('Index a doc with a stream field', async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          message: JSON.stringify({
            '@timestamp': '2024-01-01T00:00:00.000Z',
            'log.level': 'info',
            'log.logger': 'nginx',
            message: 'test',
            stream: 'somethingelse', // a field named stream should work as well
          }),
        };
        const result = await indexAndAssertTargetStream(esClient, rootStream, doc);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:00.000Z',
          body: { text: 'test' },
          severity_text: 'info',
          attributes: {
            'log.logger': 'nginx',
            stream: 'somethingelse',
          },
          stream: { name: rootStream },
        });
      });

      it(`Fork ${rootStream} to ${rootStream}.nginx`, async () => {
        const body = {
          stream: {
            name: `${rootStream}.nginx`,
          },
          where: {
            field: 'attributes.log.logger',
            eq: 'nginx',
          },
          status,
        };
        const response = await forkStream(apiClient, rootStream, body);
        expect(response).to.have.property('acknowledged', true);
      });

      // ES|QL views API is not available in all environments
      if (!isServerless) {
        it(`creates ES|QL view $.${rootStream}.nginx for the forked child stream`, async () => {
          if (!viewsApiAvailable) return;
          const childStreamName = `${rootStream}.nginx`;
          const response = await esClient.transport.request<{
            views: Array<{ name: string; query: string }>;
          }>({
            method: 'GET',
            path: `/_query/view/%24.${childStreamName}`,
          });
          expect(response.views).to.have.length(1);
          expect(response.views[0].name).to.eql(`$.${childStreamName}`);
          expect(response.views[0].query).to.eql(`FROM ${childStreamName}`);
        });

        it(`updates parent $.${rootStream} view to reference the forked child's view`, async () => {
          if (!viewsApiAvailable) return;
          const response = await esClient.transport.request<{
            views: Array<{ name: string; query: string }>;
          }>({
            method: 'GET',
            path: `/_query/view/%24.${rootStream}`,
          });
          expect(response.views).to.have.length(1);
          expect(response.views[0].name).to.eql(`$.${rootStream}`);
          expect(response.views[0].query).to.eql(`FROM ${rootStream}, $.${rootStream}.nginx`);
        });
      }

      it(`fails to fork ${rootStream} to ${rootStream}.nginx when already forked`, async () => {
        const body = {
          stream: {
            name: `${rootStream}.nginx`,
          },
          where: {
            field: 'log.logger',
            eq: 'nginx',
          },
          status,
        };
        const response = await forkStream(apiClient, rootStream, body, 409);
        expect(response).to.have.property(
          'message',
          `Child stream ${rootStream}.nginx already exists`
        );
      });

      it(`fails to fork ${rootStream} when stream name contains uppercase characters`, async () => {
        const body = {
          stream: {
            name: `${rootStream}.Nginx`,
          },
          where: {
            field: 'log.logger',
            eq: 'nginx',
          },
          status,
        };
        const response = await forkStream(apiClient, rootStream, body, 400);
        expect(response).to.have.property(
          'message',
          'Desired stream state is invalid: Stream name cannot contain uppercase characters.'
        );
      });

      it(`fails to fork ${rootStream} with empty stream name`, async () => {
        const body = {
          stream: {
            name: `${rootStream}.`, // empty child stream name
          },
          where: {
            field: 'log.logger',
            eq: 'nginx',
          },
          status,
        };
        const response = await forkStream(apiClient, rootStream, body, 400);
        expect(response).to.have.property(
          'message',
          'Desired stream state is invalid: Stream name must not be empty.'
        );
      });

      it(`fails to fork ${rootStream} with stream name that is over the 200 character limit`, async () => {
        const body = {
          stream: {
            // child stream is 201 chars
            name: `${rootStream}.xwdaqmsegtkamcrofcfcomnlkkkrkqtlkbqizvjvtrbwereqygqaaxmodzccqipzpwymyowrtvljtxevczoohrbpgijilsdptszgssmrkpwhvkukkgiqhvmcuzygmolyyadbxwngbkqjkretmzhgntkjkhrmltgyurufizwlelvmaqtngwhwqhxpfsuxiivxspvtwfcem`,
          },
          where: {
            field: 'log.logger',
            eq: 'nginx',
          },
          status,
        };
        const response = await forkStream(apiClient, rootStream, body, 400);
        expect(response).to.have.property(
          'message',
          'Desired stream state is invalid: Stream name cannot be longer than 200 characters.'
        );
      });

      it(`Index an Nginx access log message, should goto ${rootStream}.nginx`, async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:10.000Z',
          message: JSON.stringify({
            '@timestamp': '2024-01-01T00:00:10.000Z',
            'log.level': 'info',
            'log.logger': 'nginx',
            message: 'test',
          }),
        };
        const result = await indexAndAssertTargetStream(esClient, `${rootStream}.nginx`, doc);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:10.000Z',
          body: { text: 'test' },
          severity_text: 'info',
          attributes: {
            'log.logger': 'nginx',
          },
          stream: { name: `${rootStream}.nginx` },
        });
      });

      it(`Index an Nginx access log message with subobjects, should goto ${rootStream}.nginx`, async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:10.000Z',
          message: 'test',
          log: {
            level: 'info',
            logger: 'nginx',
          },
        };
        const result = await indexAndAssertTargetStream(esClient, `${rootStream}.nginx`, doc);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:10.000Z',
          body: { text: 'test' },
          severity_text: 'info',
          attributes: {
            'log.logger': 'nginx',
          },
          stream: { name: `${rootStream}.nginx` },
        });
      });

      it(`Fork ${rootStream} to ${rootStream}.nginx.access`, async () => {
        const body = {
          stream: {
            name: `${rootStream}.nginx.access`,
          },
          where: { field: 'severity_text', eq: 'info' },
          status,
        };
        const response = await forkStream(apiClient, `${rootStream}.nginx`, body);
        expect(response).to.have.property('acknowledged', true);
      });

      const accessLogDoc = {
        '@timestamp': '2024-01-01T00:00:20.000Z',
        message: JSON.stringify({
          '@timestamp': '2024-01-01T00:00:20.000Z',
          'log.level': 'info',
          'log.logger': 'nginx',
          message: 'test',
        }),
      };

      it(`Index an Nginx access log message, should goto ${rootStream}.nginx.access`, async () => {
        const result = await indexAndAssertTargetStream(
          esClient,
          `${rootStream}.nginx.access`,
          accessLogDoc
        );
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:20.000Z',
          body: { text: 'test' },
          severity_text: 'info',
          attributes: {
            'log.logger': 'nginx',
          },
          stream: { name: `${rootStream}.nginx.access` },
        });
      });

      it(`Does not index to ${rootStream}.nginx.access if routing is disabled`, async () => {
        await putStream(apiClient, `${rootStream}.nginx`, {
          ...emptyAssets,
          stream: {
            type: 'wired',
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              settings: {},
              processing: { steps: [] },
              wired: {
                fields: {},
                routing: [
                  {
                    destination: `${rootStream}.nginx.access`,
                    where: { field: 'severity_text', eq: 'info' },
                    status: 'disabled',
                  },
                ],
              },
              failure_store: { inherit: {} },
            },
          },
        });

        await indexAndAssertTargetStream(esClient, `${rootStream}.nginx`, accessLogDoc);
      });
    });

    describe('Full flow for logs.ecs', () => {
      const rootStream = 'logs.ecs';

      before(async () => {
        await enableStreams(apiClient);
      });

      after(async () => {
        await disableStreams(apiClient);
      });

      it(`Index an ECS document to ${rootStream}, should go to ${rootStream}`, async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          message: 'test message',
          log: {
            level: 'info',
            logger: 'apache',
          },
        };
        const response = await indexDocument(esClient, rootStream, doc);
        expect(response.result).to.eql('created');
        const result = await fetchDocument(esClient, rootStream, response._id);
        expect(result._index).to.match(new RegExp(`^\\.ds\\-${rootStream.replace('.', '\\.')}-.*`));
        expect(result._source).to.have.property('@timestamp', '2024-01-01T00:00:00.000Z');
        expect(result._source).to.have.property('message', 'test message');
        // With subobjects: false, stream.name is a flat dotted key
        expect((result._source as JsonObject)['stream.name']).to.eql(rootStream);
      });

      it('Index an ECS doc with nested fields', async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          message: 'test message',
          log: {
            level: 'error',
            logger: 'apache',
          },
          service: {
            name: 'my-service',
          },
        };
        const result = await indexAndAssertTargetStream(esClient, rootStream, doc);
        expect(result._source).to.have.property('@timestamp', '2024-01-01T00:00:00.000Z');
        expect(result._source).to.have.property('message', 'test message');
        expect((result._source as JsonObject)['stream.name']).to.eql(rootStream);
      });

      it(`Fork ${rootStream} to ${rootStream}.apache`, async () => {
        const body = {
          stream: {
            name: `${rootStream}.apache`,
          },
          where: {
            field: 'log.logger',
            eq: 'apache',
          },
          status,
        };
        const response = await forkStream(apiClient, rootStream, body);
        expect(response).to.have.property('acknowledged', true);
      });

      it(`fails to fork ${rootStream} to ${rootStream}.apache when already forked`, async () => {
        const body = {
          stream: {
            name: `${rootStream}.apache`,
          },
          where: {
            field: 'log.logger',
            eq: 'apache',
          },
          status,
        };
        const response = await forkStream(apiClient, rootStream, body, 409);
        expect(response).to.have.property(
          'message',
          `Child stream ${rootStream}.apache already exists`
        );
      });

      it(`Index an Apache log message, should goto ${rootStream}.apache`, async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:10.000Z',
          message: 'Apache access log',
          log: {
            level: 'info',
            logger: 'apache',
          },
        };
        const result = await indexAndAssertTargetStream(esClient, `${rootStream}.apache`, doc);
        expect(result._source).to.have.property('@timestamp', '2024-01-01T00:00:10.000Z');
        expect(result._source).to.have.property('message', 'Apache access log');
        expect((result._source as JsonObject)['stream.name']).to.eql(`${rootStream}.apache`);
      });

      it(`Fork ${rootStream}.apache to ${rootStream}.apache.error`, async () => {
        const body = {
          stream: {
            name: `${rootStream}.apache.error`,
          },
          where: { field: 'log.level', eq: 'error' },
          status,
        };
        const response = await forkStream(apiClient, `${rootStream}.apache`, body);
        expect(response).to.have.property('acknowledged', true);
      });

      const errorLogDoc = {
        '@timestamp': '2024-01-01T00:00:20.000Z',
        message: 'Apache error log',
        log: {
          level: 'error',
          logger: 'apache',
        },
      };

      it(`Index an Apache error log message, should goto ${rootStream}.apache.error`, async () => {
        const result = await indexAndAssertTargetStream(
          esClient,
          `${rootStream}.apache.error`,
          errorLogDoc
        );
        expect(result._source).to.have.property('@timestamp', '2024-01-01T00:00:20.000Z');
        expect(result._source).to.have.property('message', 'Apache error log');
        expect((result._source as JsonObject)['stream.name']).to.eql(`${rootStream}.apache.error`);
      });

      it(`Does not index to ${rootStream}.apache.error if routing is disabled`, async () => {
        await putStream(apiClient, `${rootStream}.apache`, {
          ...emptyAssets,
          stream: {
            type: 'wired',
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              settings: {},
              processing: { steps: [] },
              wired: {
                fields: {},
                routing: [
                  {
                    destination: `${rootStream}.apache.error`,
                    where: { field: 'log.level', eq: 'error' },
                    status: 'disabled',
                  },
                ],
              },
              failure_store: { inherit: {} },
            },
          },
        });

        await indexAndAssertTargetStream(esClient, `${rootStream}.apache`, errorLogDoc);
      });
    });

    // Additional validation and edge case tests (run once for 'logs.otel' only)
    describe('Full flow - validation and edge cases', () => {
      before(async () => {
        await enableStreams(apiClient);
        // Create prerequisite streams for validation tests
        await forkStream(apiClient, 'logs.otel', {
          stream: { name: 'logs.otel.nginx' },
          where: { field: 'attributes.log.logger', eq: 'nginx' },
          status,
        });
        await forkStream(apiClient, 'logs.otel.nginx', {
          stream: { name: 'logs.otel.nginx.access' },
          where: { field: 'severity_text', eq: 'info' },
          status,
        });
      });

      after(async () => {
        await disableStreams(apiClient);
      });

      it('Fork logs.otel to logs.otel.nginx.error with invalid condition', async () => {
        const body = {
          stream: {
            name: 'logs.otel.nginx.error',
          },
          where: { field: 'attributes.log', eq: 'error' },
          status,
        };
        const response = await forkStream(apiClient, 'logs.otel.nginx', body);
        expect(response).to.have.property('acknowledged', true);
      });

      it('Index an Nginx error log message, should goto logs.otel.nginx.error but fails', async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:20.000Z',
          message: JSON.stringify({
            '@timestamp': '2024-01-01T00:00:20.000Z',
            'log.level': 'error',
            'log.logger': 'nginx',
            message: 'test',
          }),
        };
        const result = await indexAndAssertTargetStream(esClient, 'logs.otel.nginx', doc);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:20.000Z',
          body: { text: 'test' },
          severity_text: 'error',
          attributes: {
            'log.logger': 'nginx',
          },
          stream: { name: 'logs.otel.nginx' },
        });
      });

      it('Fork logs.otel to logs.otel.number-test', async () => {
        const body = {
          stream: {
            name: 'logs.otel.number-test',
          },
          where: { field: 'attributes.code', gte: '500' },
          status,
        };
        const response = await forkStream(apiClient, 'logs.otel', body);
        expect(response).to.have.property('acknowledged', true);
      });

      it('Index documents with numbers and strings for logs.otel.number-test condition', async () => {
        const doc1 = {
          '@timestamp': '2024-01-01T00:00:20.000Z',
          message: JSON.stringify({
            '@timestamp': '2024-01-01T00:00:20.000Z',
            code: '500',
            message: 'test',
          }),
        };
        const doc2 = {
          '@timestamp': '2024-01-01T00:00:20.000Z',
          message: JSON.stringify({
            '@timestamp': '2024-01-01T00:00:20.000Z',
            code: 500,
            message: 'test',
          }),
        };
        await indexAndAssertTargetStream(esClient, 'logs.otel.number-test', doc1);
        await indexAndAssertTargetStream(esClient, 'logs.otel.number-test', doc2);
      });

      it('Fork logs.otel to logs.otel.string-test', async () => {
        const body = {
          stream: {
            name: 'logs.otel.string-test',
          },
          where: {
            or: [
              { field: 'body.text', contains: '500' },
              { field: 'body.text', contains: 400 },
            ],
          },
          status,
        };
        const response = await forkStream(apiClient, 'logs.otel', body);
        expect(response).to.have.property('acknowledged', true);
      });

      it('Index documents with numbers and strings for logs.otel.string-test condition', async () => {
        const doc1 = {
          '@timestamp': '2024-01-01T00:00:20.000Z',
          message: JSON.stringify({
            '@timestamp': '2024-01-01T00:00:20.000Z',
            message: 'status_code: 500',
          }),
        };
        const doc2 = {
          '@timestamp': '2024-01-01T00:00:20.000Z',
          message: JSON.stringify({
            '@timestamp': '2024-01-01T00:00:20.000Z',
            message: 'status_code: 400',
          }),
        };
        await indexAndAssertTargetStream(esClient, 'logs.otel.string-test', doc1);
        await indexAndAssertTargetStream(esClient, 'logs.otel.string-test', doc2);
      });

      it('Fork logs.otel to logs.otel.weird-characters', async () => {
        const body = {
          stream: {
            name: 'logs.otel.weird-characters',
          },
          where: {
            or: [
              {
                field: 'attributes.@abc.weird fieldname',
                contains: 'route_it',
              },
            ],
          },
          status,
        };
        const response = await forkStream(apiClient, 'logs.otel', body);
        expect(response).to.have.property('acknowledged', true);
      });

      it('Index documents with weird characters in their field names correctly', async () => {
        const doc1 = {
          '@timestamp': '2024-01-01T00:00:20.000Z',
          '@abc': {
            'weird fieldname': 'Please route_it',
          },
        };
        const doc2 = {
          '@timestamp': '2024-01-01T00:00:20.000Z',
          '@abc': {
            'weird fieldname': 'Keep where it is',
          },
        };
        await indexAndAssertTargetStream(esClient, 'logs.otel.weird-characters', doc1);
        await indexAndAssertTargetStream(esClient, 'logs.otel', doc2);
      });

      it('should allow to update field type to incompatible type', async () => {
        const body: Streams.WiredStream.UpsertRequest = {
          ...emptyAssets,
          stream: {
            type: 'wired',
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {
                  'attributes.myfield': {
                    type: 'boolean',
                  },
                },
                routing: [],
              },
              failure_store: { inherit: {} },
            },
          },
        };
        await putStream(apiClient, 'logs.otel.rollovertest', body, 200);
        await putStream(
          apiClient,
          'logs.otel.rollovertest',
          {
            ...body,
            stream: {
              type: 'wired',
              description: '',
              ingest: {
                ...body.stream.ingest,
                wired: {
                  ...body.stream.ingest.wired,
                  fields: {
                    'attributes.myfield': {
                      type: 'keyword',
                    },
                  },
                },
              },
            },
          },
          200
        );
      });

      it('should not allow to update field type to system', async () => {
        const body: Streams.WiredStream.UpsertRequest = {
          ...emptyAssets,
          stream: {
            type: 'wired',
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {
                  'attributes.myfield': {
                    type: 'system',
                  },
                },
                routing: [],
              },
              failure_store: { inherit: {} },
            },
          },
        };
        await putStream(apiClient, 'logs.otel.willfail', body, 400);
      });

      it('should not roll over more often than necessary', async () => {
        const expectedIndexCounts: Record<string, number> = {
          'logs.otel': 1,
          'logs.otel.nginx': 1,
          'logs.otel.nginx.access': 1,
          'logs.otel.nginx.error': 1,
          'logs.otel.number-test': 1,
          'logs.otel.string-test': 1,
          'logs.otel.weird-characters': 1,
          'logs.otel.rollovertest': 2,
        };
        const dataStreams = await esClient.indices.getDataStream({
          name: Object.keys(expectedIndexCounts).join(','),
        });
        const actualIndexCounts = Object.fromEntries(
          dataStreams.data_streams.map((stream) => [
            stream.name,
            stream.indices.length + (stream.rollover_on_write ? 1 : 0),
          ])
        );

        expect(actualIndexCounts).to.eql(expectedIndexCounts);
      });

      it('removes routing from parent when child is deleted', async () => {
        const deleteResponse = await apiClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: 'logs.otel.nginx.access',
            },
          },
        });
        expect(deleteResponse.status).to.eql(200);

        const streamResponse = await getStream(apiClient, 'logs.otel.nginx');
        expect(
          (streamResponse.stream as Streams.WiredStream.Definition).ingest.wired.routing
        ).to.eql([
          {
            destination: 'logs.otel.nginx.error',
            status: 'enabled',
            where: {
              field: 'attributes.log',
              eq: 'error',
            },
          },
        ]);
      });

      it('deletes children when parent is deleted', async () => {
        const deleteResponse = await apiClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: 'logs.otel.nginx',
            },
          },
        });
        expect(deleteResponse.status).to.eql(200);

        await getStream(apiClient, 'logs.otel.nginx', 404);
        await getStream(apiClient, 'logs.otel.nginx.error', 404);
      });
    });

    async function expectFields(streams: string[], expectedFields: InheritedFieldDefinition) {
      const definitions = await Promise.all(streams.map((stream) => getStream(apiClient, stream)));
      for (const definition of definitions) {
        const inherited = Streams.WiredStream.GetResponse.parse(definition).inherited_fields;
        for (const [field, fieldConfig] of Object.entries(expectedFields)) {
          expect(inherited[field]).to.eql(fieldConfig);
        }
      }

      const isEcs = streams[0].startsWith('logs.ecs');
      const mappingsResponse = await esClient.indices.getMapping({ index: streams });
      for (const { mappings } of Object.values(mappingsResponse)) {
        for (const [field, fieldConfig] of Object.entries(expectedFields)) {
          if (isEcs) {
            // With subobjects: false, dotted field names are literal keys in mappings
            expect(get(mappings.properties, [field])).to.eql(omit(fieldConfig, ['from']));
          } else {
            const fieldPath = field.split('.').join('.properties.');
            expect(get(mappings.properties, fieldPath)).to.eql(omit(fieldConfig, ['from']));
          }
        }
      }
    }

    // Test field inheritance for new root streams
    ['logs.otel', 'logs.ecs'].forEach((rootStream) => {
      describe(`Basic setup for ${rootStream}`, () => {
        before(async () => {
          await enableStreams(apiClient);
        });

        after(async () => {
          await disableStreams(apiClient);
        });

        it('inherit fields', async () => {
          const fields: FieldDefinition = {
            'attributes.foo': { type: 'keyword' },
            'attributes.bar': { type: 'long' },
          };
          await putStream(apiClient, `${rootStream}.one`, {
            ...emptyAssets,
            stream: {
              type: 'wired',
              description: '',
              ingest: {
                lifecycle: { inherit: {} },
                processing: { steps: [] },
                settings: {},
                wired: { fields, routing: [] },
                failure_store: { inherit: {} },
              },
            },
          });

          await putStream(apiClient, `${rootStream}.one.two.three`, {
            ...emptyAssets,
            stream: {
              type: 'wired',
              description: '',
              ingest: {
                lifecycle: { inherit: {} },
                processing: { steps: [] },
                settings: {},
                wired: { fields: {}, routing: [] },
                failure_store: { inherit: {} },
              },
            },
          });

          const inheritedFields = Object.entries(fields).reduce((acc, field) => {
            acc[field[0]] = { ...field[1], from: `${rootStream}.one` };
            return acc;
          }, {} as InheritedFieldDefinition);

          await expectFields(
            [`${rootStream}.one.two`, `${rootStream}.one.two.three`],
            inheritedFields
          );
        });
      });
    });

    // Validation tests (run once for 'logs.otel' only)
    describe('Basic setup - validation', () => {
      before(async () => {
        await enableStreams(apiClient);
      });

      after(async () => {
        await disableStreams(apiClient);
      });

      it('persists description-only overrides without freezing inherited mappings', async () => {
        const parentStream = 'logs.otel.doconlyparent';
        const childStream = `${parentStream}.child`;
        const fieldName = 'attributes.abc';
        const childDescription = 'Child-only description override';

        try {
          // Create a parent/child hierarchy via fork so routing linkage is valid.
          await forkStream(apiClient, 'logs.otel', {
            stream: { name: parentStream },
            where: { always: {} },
            status,
          });
          await forkStream(apiClient, parentStream, {
            stream: { name: childStream },
            where: { always: {} },
            status,
          });

          // Update the parent stream to include a mapped field.
          const parentBefore = Streams.WiredStream.GetResponse.parse(
            await getStream(apiClient, parentStream)
          );
          const { updated_at: _parentProcessingUpdatedAt, ...parentProcessing } =
            parentBefore.stream.ingest.processing;
          await putStream(apiClient, parentStream, {
            ...emptyAssets,
            stream: {
              type: 'wired',
              description: parentBefore.stream.description,
              ingest: {
                ...parentBefore.stream.ingest,
                processing: parentProcessing,
                wired: {
                  ...parentBefore.stream.ingest.wired,
                  fields: {
                    ...parentBefore.stream.ingest.wired.fields,
                    [fieldName]: { type: 'keyword', ignore_above: 256 },
                  },
                },
              },
            },
          });

          // Update the child stream to only override the description (no type persisted).
          const childBefore = Streams.WiredStream.GetResponse.parse(
            await getStream(apiClient, childStream)
          );
          const { updated_at: _childProcessingUpdatedAt, ...childProcessing } =
            childBefore.stream.ingest.processing;
          await putStream(apiClient, childStream, {
            ...emptyAssets,
            stream: {
              type: 'wired',
              description: childBefore.stream.description,
              ingest: {
                ...childBefore.stream.ingest,
                processing: childProcessing,
                wired: {
                  ...childBefore.stream.ingest.wired,
                  fields: {
                    ...childBefore.stream.ingest.wired.fields,
                    [fieldName]: { description: childDescription },
                  },
                },
              },
            },
          });

          const childBeforeParentMapping = Streams.WiredStream.GetResponse.parse(
            await getStream(apiClient, childStream)
          );

          expect(childBeforeParentMapping.stream.ingest.wired.fields[fieldName]).to.eql({
            description: childDescription,
          });
          expect(childBeforeParentMapping.inherited_fields[fieldName]).to.eql({
            type: 'keyword',
            ignore_above: 256,
            from: parentStream,
          });

          // Later: parent updates the mapping configuration. The child should reflect the updated
          // inherited mapping, while keeping its own description override as a typeless entry.
          const parentForUpdate = Streams.WiredStream.GetResponse.parse(
            await getStream(apiClient, parentStream)
          );
          const { updated_at: _parentForUpdateProcessingUpdatedAt, ...parentProcessingForUpdate } =
            parentForUpdate.stream.ingest.processing;
          await putStream(apiClient, parentStream, {
            ...emptyAssets,
            stream: {
              type: 'wired',
              description: parentForUpdate.stream.description,
              ingest: {
                ...parentForUpdate.stream.ingest,
                processing: parentProcessingForUpdate,
                wired: {
                  ...parentForUpdate.stream.ingest.wired,
                  fields: {
                    ...parentForUpdate.stream.ingest.wired.fields,
                    [fieldName]: { type: 'keyword', ignore_above: 1024 },
                  },
                },
              },
            },
          });

          const childAfterParentMapping = Streams.WiredStream.GetResponse.parse(
            await getStream(apiClient, childStream)
          );

          expect(childAfterParentMapping.inherited_fields[fieldName]).to.eql({
            type: 'keyword',
            ignore_above: 1024,
            from: parentStream,
          });
          expect(childAfterParentMapping.stream.ingest.wired.fields[fieldName]).to.eql({
            description: childDescription,
          });
        } finally {
          await deleteStream(apiClient, childStream).catch(() => {});
          await deleteStream(apiClient, parentStream).catch(() => {});
        }
      });

      it('fails to create a stream if an existing template takes precedence', async () => {
        const index = 'logs.otel.noprecedence';
        await esClient.indices.putIndexTemplate({
          name: 'highest_priority_template',
          index_patterns: [index],
          priority: `${MAX_PRIORITY}` as unknown as number,
        });

        try {
          await putStream(
            apiClient,
            index,
            {
              ...emptyAssets,
              stream: {
                type: 'wired',
                description: '',
                ingest: {
                  lifecycle: { inherit: {} },
                  processing: { steps: [] },
                  settings: {},
                  wired: { fields: {}, routing: [] },
                  failure_store: { inherit: {} },
                },
              },
            },
            500
          );
        } finally {
          await esClient.indices
            .deleteIndexTemplate({ name: 'highest_priority_template' })
            .catch(() => {});
        }
      });

      it('does not allow super deeply nested streams', async () => {
        const body: Streams.WiredStream.UpsertRequest = {
          ...emptyAssets,
          stream: {
            type: 'wired',
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: { fields: {}, routing: [] },
              failure_store: { inherit: {} },
            },
          },
        };

        await putStream(apiClient, 'logs.super.duper.hyper.deeply.nested.streamname', body, 400);
      });

      describe('stream name validation', () => {
        const validStreamBody: Streams.WiredStream.UpsertRequest = {
          ...emptyAssets,
          stream: {
            type: 'wired',
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: { fields: {}, routing: [] },
              failure_store: { inherit: {} },
            },
          },
        };

        it('fails to create a wired stream with uppercase characters in the name', async () => {
          const response = await putStream(apiClient, 'logs.UpperCase', validStreamBody, 400);
          expect((response as unknown as { message: string }).message).to.contain(
            'Stream name cannot contain uppercase characters.'
          );
        });

        it('fails to create a wired stream with spaces in the name', async () => {
          const response = await putStream(apiClient, 'logs.with space', validStreamBody, 400);
          expect((response as unknown as { message: string }).message).to.contain(
            'Stream name cannot contain spaces.'
          );
        });

        it('fails to create a wired stream with asterisk in the name', async () => {
          const response = await putStream(apiClient, 'logs.with*asterisk', validStreamBody, 400);
          expect((response as unknown as { message: string }).message).to.contain(
            'Stream name cannot contain "*".'
          );
        });

        it('fails to create a wired stream with angle brackets in the name', async () => {
          const response = await putStream(apiClient, 'logs.with<brackets>', validStreamBody, 400);
          expect((response as unknown as { message: string }).message).to.contain(
            'Stream name cannot contain "<".'
          );
        });

        it('fails to create a wired stream with question mark in the name', async () => {
          const response = await putStream(apiClient, 'logs.with?question', validStreamBody, 400);
          expect((response as unknown as { message: string }).message).to.contain(
            'Stream name cannot contain "?".'
          );
        });

        it('fails to create a wired stream with pipe in the name', async () => {
          const response = await putStream(apiClient, 'logs.with|pipe', validStreamBody, 400);
          expect((response as unknown as { message: string }).message).to.contain(
            'Stream name cannot contain "|".'
          );
        });

        it('fails to fork a wired stream with special characters in the destination name', async () => {
          const body = {
            stream: {
              name: 'logs.otel.with*special',
            },
            where: {
              field: 'log.logger',
              eq: 'test',
            },
            status,
          };
          const response = await forkStream(apiClient, 'logs.otel', body, 400);
          expect((response as unknown as { message: string }).message).to.contain(
            'Stream name cannot contain "*".'
          );
        });
      });
    });
  });
}
