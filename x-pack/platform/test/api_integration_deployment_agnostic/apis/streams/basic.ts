/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FieldDefinition, RoutingStatus } from '@kbn/streams-schema';
import { Streams, emptyAssets } from '@kbn/streams-schema';
import { MAX_PRIORITY } from '@kbn/streams-plugin/server/lib/streams/index_templates/generate_index_template';
import type { InheritedFieldDefinition } from '@kbn/streams-schema/src/fields';
import { get, omit } from 'lodash';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import {
  createStreamsRepositoryAdminClient,
  createStreamsRepositoryViewerClient,
} from './helpers/repository_client';
import {
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
  const isServerless = !!config.get('serverless');
  const esClient = getService('es');
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

  describe('Basic functionality', () => {
    async function getWiredStatus() {
      const response = await viewerApiClient.fetch('GET /api/streams/_status').expect(200);
      return response.body;
    }

    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      viewerApiClient = await createStreamsRepositoryViewerClient(roleScopedSupertest);
    });

    describe('initially', () => {
      let resources: Resources;

      before(async () => {
        resources = await getResources();
      });

      it('is not enabled', async () => {
        const wiredStatus = await getWiredStatus();
        expect(wiredStatus.logs).to.eql(false);
        expect(wiredStatus['logs.otel']).to.eql(false);
        expect(wiredStatus['logs.ecs']).to.eql(false);
      });

      describe('after enabling', () => {
        before(async () => {
          await enableStreams(apiClient);
        });

        it('reports enabled status', async () => {
          const wiredStatus = await getWiredStatus();
          expect(wiredStatus.logs).to.eql(false);
          expect(wiredStatus['logs.otel']).to.eql(true);
          expect(wiredStatus['logs.ecs']).to.eql(true);
        });

        it('includes create_snapshot_repository in stream privileges', async () => {
          const stream = await getStream(apiClient, 'logs.otel');
          const parsed = Streams.WiredStream.GetResponse.parse(stream);
          expect(typeof parsed.privileges.create_snapshot_repository).to.eql('boolean');
        });

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

        it('is enabled', async () => {
          await disableStreams(apiClient);
        });

        describe('after disabling', () => {
          before(async () => {
            await disableStreams(apiClient);
          });

          it('cleans up all the resources', async () => {
            expect(await getResources()).to.eql(resources);
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
        expect(result._source).to.have.property('stream');
        expect((result._source as any).stream).to.have.property('name', rootStream);
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
        expect(result._source).to.have.property('stream');
        expect((result._source as any).stream).to.have.property('name', rootStream);
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
        expect(result._source).to.have.property('stream');
        expect((result._source as any).stream).to.have.property('name', `${rootStream}.apache`);
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
        expect(result._source).to.have.property('stream');
        expect((result._source as any).stream).to.have.property(
          'name',
          `${rootStream}.apache.error`
        );
      });

      it(`Does not index to ${rootStream}.apache.error if routing is disabled`, async () => {
        await putStream(apiClient, `${rootStream}.apache`, {
          ...emptyAssets,
          stream: {
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

      const mappingsResponse = await esClient.indices.getMapping({ index: streams });
      for (const { mappings } of Object.values(mappingsResponse)) {
        for (const [field, fieldConfig] of Object.entries(expectedFields)) {
          const fieldPath = field.split('.').join('.properties.');
          expect(get(mappings.properties, fieldPath)).to.eql(omit(fieldConfig, ['from']));
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

      it('fails to create a stream if an existing template takes precedence', async () => {
        const index = 'logs.otel.noprecedence';
        await esClient.indices.putIndexTemplate({
          name: 'highest_priority_template',
          index_patterns: [index],
          priority: `${MAX_PRIORITY}` as unknown as number,
        });

        await putStream(
          apiClient,
          index,
          {
            ...emptyAssets,
            stream: {
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
      });

      it('does not allow super deeply nested streams', async () => {
        const body: Streams.WiredStream.UpsertRequest = {
          ...emptyAssets,
          stream: {
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
