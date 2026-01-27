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
    async function getEnabled() {
      const response = await viewerApiClient.fetch('GET /api/streams/_status').expect(200);
      return response.body.enabled;
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
        expect(await getEnabled()).to.eql(false);
      });

      describe('after enabling', () => {
        before(async () => {
          await enableStreams(apiClient);
        });

        it('reports enabled status', async () => {
          expect(await getEnabled()).to.eql(true);
        });

        // Elasticsearch doesn't support streams in serverless mode yet
        if (!isServerless) {
          it('reports conflict if disabled on Elasticsearch level', async () => {
            await esClient.transport.request({
              method: 'POST',
              path: '/_streams/logs/_disable',
            });
            expect(await getEnabled()).to.eql('conflict');
          });

          it('reports enabled after calling enabled again', async () => {
            await enableStreams(apiClient);
            expect(await getEnabled()).to.eql(true);
          });

          it('Elasticsearch streams is enabled too', async () => {
            const response = await esClient.transport.request({
              method: 'GET',
              path: '/_streams/status',
            });
            expect(response).to.eql({
              logs: {
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
            expect(await getEnabled()).to.eql(false);
          });
        });
      });
    });

    // Note: Each step is dependent on the previous
    describe('Full flow', () => {
      before(async () => {
        await enableStreams(apiClient);
      });

      after(async () => {
        await disableStreams(apiClient);
      });

      it('Index a JSON document to logs, should go to logs', async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          message: JSON.stringify({
            '@timestamp': '2024-01-01T00:00:00.000Z',
            'log.level': 'info',
            'log.logger': 'nginx',
            message: 'test',
          }),
        };
        const response = await indexDocument(esClient, 'logs', doc);
        expect(response.result).to.eql('created');
        const result = await fetchDocument(esClient, 'logs', response._id);
        expect(result._index).to.match(/^\.ds\-logs-.*/);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:00.000Z',
          body: {
            text: 'test',
          },
          severity_text: 'info',
          attributes: { 'log.logger': 'nginx' },
          stream: { name: 'logs' },
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
        const result = await indexAndAssertTargetStream(esClient, 'logs', doc);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:00.000Z',
          body: { text: 'test' },
          severity_text: 'info',
          attributes: {
            'log.logger': 'nginx',
            stream: 'somethingelse',
          },
          stream: { name: 'logs' },
        });
      });

      it('Fork logs to logs.nginx', async () => {
        const body = {
          stream: {
            name: 'logs.nginx',
          },
          where: {
            field: 'attributes.log.logger',
            eq: 'nginx',
          },
          status,
        };
        const response = await forkStream(apiClient, 'logs', body);
        expect(response).to.have.property('acknowledged', true);
      });

      it('fails to fork logs to logs.nginx when already forked', async () => {
        const body = {
          stream: {
            name: 'logs.nginx',
          },
          where: {
            field: 'log.logger',
            eq: 'nginx',
          },
          status,
        };
        const response = await forkStream(apiClient, 'logs', body, 409);
        expect(response).to.have.property('message', 'Child stream logs.nginx already exists');
      });

      it('fails to fork logs when stream name contains uppercase characters', async () => {
        const body = {
          stream: {
            name: 'logs.Nginx',
          },
          where: {
            field: 'log.logger',
            eq: 'nginx',
          },
          status,
        };
        const response = await forkStream(apiClient, 'logs', body, 400);
        expect(response).to.have.property(
          'message',
          'Desired stream state is invalid: Stream name cannot contain uppercase characters.'
        );
      });

      it('fails to fork logs with empty stream name', async () => {
        const body = {
          stream: {
            name: 'logs.', // empty child stream name
          },
          where: {
            field: 'log.logger',
            eq: 'nginx',
          },
          status,
        };
        const response = await forkStream(apiClient, 'logs', body, 400);
        expect(response).to.have.property(
          'message',
          'Desired stream state is invalid: Stream name must not be empty.'
        );
      });

      it('fails to fork logs with stream name that is over the 200 character limit', async () => {
        const body = {
          stream: {
            // child stream is 201 chars
            name: 'logs.xwdaqmsegtkamcrofcfcomnlkkkrkqtlkbqizvjvtrbwereqygqaaxmodzccqipzpwymyowrtvljtxevczoohrbpgijilsdptszgssmrkpwhvkukkgiqhvmcuzygmolyyadbxwngbkqjkretmzhgntkjkhrmltgyurufizwlelvmaqtngwhwqhxpfsuxiivxspvtwfcem',
          },
          where: {
            field: 'log.logger',
            eq: 'nginx',
          },
          status,
        };
        const response = await forkStream(apiClient, 'logs', body, 400);
        expect(response).to.have.property(
          'message',
          'Desired stream state is invalid: Stream name cannot be longer than 200 characters.'
        );
      });

      it('Index an Nginx access log message, should goto logs.nginx', async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:10.000Z',
          message: JSON.stringify({
            '@timestamp': '2024-01-01T00:00:10.000Z',
            'log.level': 'info',
            'log.logger': 'nginx',
            message: 'test',
          }),
        };
        const result = await indexAndAssertTargetStream(esClient, 'logs.nginx', doc);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:10.000Z',
          body: { text: 'test' },
          severity_text: 'info',
          attributes: {
            'log.logger': 'nginx',
          },
          stream: { name: 'logs.nginx' },
        });
      });

      it('Index an Nginx access log message with subobjects, should goto logs.nginx', async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:10.000Z',
          message: 'test',
          log: {
            level: 'info',
            logger: 'nginx',
          },
        };
        const result = await indexAndAssertTargetStream(esClient, 'logs.nginx', doc);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:10.000Z',
          body: { text: 'test' },
          severity_text: 'info',
          attributes: {
            'log.logger': 'nginx',
          },
          stream: { name: 'logs.nginx' },
        });
      });

      it('Fork logs to logs.nginx.access', async () => {
        const body = {
          stream: {
            name: 'logs.nginx.access',
          },
          where: { field: 'severity_text', eq: 'info' },
          status,
        };
        const response = await forkStream(apiClient, 'logs.nginx', body);
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

      it('Index an Nginx access log message, should goto logs.nginx.access', async () => {
        const result = await indexAndAssertTargetStream(
          esClient,
          'logs.nginx.access',
          accessLogDoc
        );
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:20.000Z',
          body: { text: 'test' },
          severity_text: 'info',
          attributes: {
            'log.logger': 'nginx',
          },
          stream: { name: 'logs.nginx.access' },
        });
      });

      it('Does not index to logs.nginx.access if routing is disabled', async () => {
        await putStream(apiClient, 'logs.nginx', {
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
                    destination: 'logs.nginx.access',
                    where: { field: 'severity_text', eq: 'info' },
                    status: 'disabled',
                  },
                ],
              },
              failure_store: { inherit: {} },
            },
          },
        });

        await indexAndAssertTargetStream(esClient, 'logs.nginx', accessLogDoc);
      });

      it('Fork logs to logs.nginx.error with invalid condition', async () => {
        const body = {
          stream: {
            name: 'logs.nginx.error',
          },
          where: { field: 'attributes.log', eq: 'error' },
          status,
        };
        const response = await forkStream(apiClient, 'logs.nginx', body);
        expect(response).to.have.property('acknowledged', true);
      });

      it('Index an Nginx error log message, should goto logs.nginx.error but fails', async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:20.000Z',
          message: JSON.stringify({
            '@timestamp': '2024-01-01T00:00:20.000Z',
            'log.level': 'error',
            'log.logger': 'nginx',
            message: 'test',
          }),
        };
        const result = await indexAndAssertTargetStream(esClient, 'logs.nginx', doc);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:20.000Z',
          body: { text: 'test' },
          severity_text: 'error',
          attributes: {
            'log.logger': 'nginx',
          },
          stream: { name: 'logs.nginx' },
        });
      });

      it('Fork logs to logs.number-test', async () => {
        const body = {
          stream: {
            name: 'logs.number-test',
          },
          where: { field: 'attributes.code', gte: '500' },
          status,
        };
        const response = await forkStream(apiClient, 'logs', body);
        expect(response).to.have.property('acknowledged', true);
      });

      it('Index documents with numbers and strings for logs.number-test condition', async () => {
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
        await indexAndAssertTargetStream(esClient, 'logs.number-test', doc1);
        await indexAndAssertTargetStream(esClient, 'logs.number-test', doc2);
      });

      it('Fork logs to logs.string-test', async () => {
        const body = {
          stream: {
            name: 'logs.string-test',
          },
          where: {
            or: [
              { field: 'body.text', contains: '500' },
              { field: 'body.text', contains: 400 },
            ],
          },
          status,
        };
        const response = await forkStream(apiClient, 'logs', body);
        expect(response).to.have.property('acknowledged', true);
      });

      it('Index documents with numbers and strings for logs.string-test condition', async () => {
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
        await indexAndAssertTargetStream(esClient, 'logs.string-test', doc1);
        await indexAndAssertTargetStream(esClient, 'logs.string-test', doc2);
      });

      it('Fork logs to logs.weird-characters', async () => {
        const body = {
          stream: {
            name: 'logs.weird-characters',
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
        const response = await forkStream(apiClient, 'logs', body);
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
        await indexAndAssertTargetStream(esClient, 'logs.weird-characters', doc1);
        await indexAndAssertTargetStream(esClient, 'logs', doc2);
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
        await putStream(apiClient, 'logs.rollovertest', body, 200);
        await putStream(
          apiClient,
          'logs.rollovertest',
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
        await putStream(apiClient, 'logs.willfail', body, 400);
      });

      it('should not roll over more often than necessary', async () => {
        const expectedIndexCounts: Record<string, number> = {
          logs: 1,
          'logs.nginx': 1,
          'logs.nginx.access': 1,
          'logs.nginx.error': 1,
          'logs.number-test': 1,
          'logs.string-test': 1,
          'logs.weird-characters': 1,
          'logs.rollovertest': 2,
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
              name: 'logs.nginx.access',
            },
          },
        });
        expect(deleteResponse.status).to.eql(200);

        const streamResponse = await getStream(apiClient, 'logs.nginx');
        expect(
          (streamResponse.stream as Streams.WiredStream.Definition).ingest.wired.routing
        ).to.eql([
          {
            destination: 'logs.nginx.error',
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
              name: 'logs.nginx',
            },
          },
        });
        expect(deleteResponse.status).to.eql(200);

        await getStream(apiClient, 'logs.nginx', 404);
        await getStream(apiClient, 'logs.nginx.error', 404);
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

    describe('Basic setup', () => {
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
        await putStream(apiClient, 'logs.one', {
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

        await putStream(apiClient, 'logs.one.two.three', {
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
          acc[field[0]] = { ...field[1], from: 'logs.one' };
          return acc;
        }, {} as InheritedFieldDefinition);

        await expectFields(['logs.one.two', 'logs.one.two.three'], inheritedFields);
      });

      it('fails to create a stream if an existing template takes precedence', async () => {
        const index = 'logs.noprecedence';
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
    });
  });
}
