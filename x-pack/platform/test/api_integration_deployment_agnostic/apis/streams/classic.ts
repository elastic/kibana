/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Streams } from '@kbn/streams-schema';
import { isNotFoundError } from '@kbn/es-errors';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';
import { fetchDocument, indexDocument, putStream } from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');
  const config = getService('config');
  const isServerless = !!config.get('serverless');

  const TEST_STREAM_NAME = 'logs-test-default';

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Classic streams', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
    });

    it('non-wired data streams', async () => {
      const doc = {
        message: '2023-01-01T00:00:10.000Z error test',
      };
      const response = await indexDocument(esClient, TEST_STREAM_NAME, doc);
      expect(response.result).to.eql('created');

      const {
        body: { streams },
        status,
      } = await apiClient.fetch('GET /api/streams 2023-10-31');

      expect(status).to.eql(200);

      const classicStream = streams.find((stream) => stream.name === TEST_STREAM_NAME);

      expect(classicStream).to.eql({
        name: TEST_STREAM_NAME,
        description: '',
        ingest: {
          lifecycle: { inherit: {} },
          processing: [],
          unwired: {},
        },
      });
    });

    it('Allows setting processing on classic streams', async () => {
      const putResponse = await apiClient.fetch('PUT /api/streams/{name} 2023-10-31', {
        params: {
          path: {
            name: TEST_STREAM_NAME,
          },
          body: {
            dashboards: [],
            queries: [],
            stream: {
              description: '',
              ingest: {
                lifecycle: { inherit: {} },
                processing: [
                  {
                    grok: {
                      if: { always: {} },
                      field: 'message',
                      patterns: [
                        '%{TIMESTAMP_ISO8601:inner_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message2}',
                      ],
                    },
                  },
                ],
                unwired: {},
              },
            },
          },
        },
      });

      expect(putResponse.status).to.eql(200);

      expect(putResponse.body).to.have.property('acknowledged', true);

      const getResponse = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
        params: { path: { name: TEST_STREAM_NAME } },
      });

      expect(getResponse.status).to.eql(200);

      const body = getResponse.body;
      Streams.UnwiredStream.GetResponse.asserts(body);

      const {
        dashboards,
        queries,
        stream,
        effective_lifecycle: effectiveLifecycle,
        elasticsearch_assets: elasticsearchAssets,
      } = body;

      expect(dashboards).to.eql([]);
      expect(queries).to.eql([]);

      expect(stream).to.eql({
        name: TEST_STREAM_NAME,
        description: '',
        ingest: {
          lifecycle: { inherit: {} },
          processing: [
            {
              grok: {
                field: 'message',
                patterns: [
                  '%{TIMESTAMP_ISO8601:inner_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message2}',
                ],
                if: { always: {} },
              },
            },
          ],
          unwired: {},
        },
      });

      expect(effectiveLifecycle).to.eql(isServerless ? { dsl: {} } : { ilm: { policy: 'logs' } });

      expect(elasticsearchAssets).to.eql({
        ingestPipeline: 'logs@default-pipeline',
        componentTemplates: ['logs@mappings', 'logs@settings', 'logs@custom', 'ecs@mappings'],
        indexTemplate: 'logs',
        dataStream: 'logs-test-default',
      });
    });

    it('Executes processing on classic streams', async () => {
      const doc = {
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
      };
      const response = await indexDocument(esClient, TEST_STREAM_NAME, doc);
      expect(response.result).to.eql('created');

      const result = await fetchDocument(esClient, TEST_STREAM_NAME, response._id);
      expect(result._source).to.eql({
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
        inner_timestamp: '2023-01-01T00:00:10.000Z',
        message2: 'test',
        log: {
          level: 'error',
        },
      });
    });

    it('Allows removing processing on classic streams', async () => {
      const response = await apiClient.fetch('PUT /api/streams/{name} 2023-10-31', {
        params: {
          path: { name: TEST_STREAM_NAME },
          body: {
            queries: [],
            dashboards: [],
            stream: {
              description: '',
              ingest: {
                lifecycle: { inherit: {} },
                processing: [],
                unwired: {},
              },
            },
          },
        },
      });

      expect(response.status).to.eql(200);

      expect(response.body).to.have.property('acknowledged', true);
    });

    it('Executes processing on classic streams after removing processing', async () => {
      const doc = {
        // default logs pipeline fills in timestamp with current date if not set
        message: '2023-01-01T00:00:10.000Z info mylogger this is the message',
      };
      const response = await indexDocument(esClient, TEST_STREAM_NAME, doc);
      expect(response.result).to.eql('created');

      const result = await fetchDocument(esClient, TEST_STREAM_NAME, response._id);
      expect(result._source).to.eql({
        // accept any date
        '@timestamp': (result._source as { [key: string]: unknown })['@timestamp'],
        message: '2023-01-01T00:00:10.000Z info mylogger this is the message',
      });
    });

    it('Allows deleting classic streams', async () => {
      const deleteStreamResponse = await apiClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
        params: {
          path: {
            name: TEST_STREAM_NAME,
          },
        },
      });

      expect(deleteStreamResponse.status).to.eql(200);

      const getStreamsResponse = await apiClient.fetch('GET /api/streams 2023-10-31');

      expect(getStreamsResponse.status).to.eql(200);

      const classicStream = getStreamsResponse.body.streams.find(
        (stream) => stream.name === TEST_STREAM_NAME
      );
      expect(classicStream).to.eql(undefined);
    });

    describe('Classic streams sharing template/pipeline', () => {
      const TEMPLATE_NAME = 'my-shared-template';
      const FIRST_STREAM_NAME = 'mytest-first';
      const SECOND_STREAM_NAME = 'mytest-second';

      before(async () => {
        await esClient.indices.putIndexTemplate({
          name: TEMPLATE_NAME,
          index_patterns: ['mytest*'],
          priority: 1000,
          template: {},
          data_stream: {
            allow_custom_routing: false,
            hidden: false,
          },
        });
      });

      after(async () => {
        await esClient.indices.deleteIndexTemplate({
          name: TEMPLATE_NAME,
        });
      });

      it('creates an ingest pipeline and updates the template when the first stream is created', async () => {
        await esClient.indices.createDataStream({
          name: FIRST_STREAM_NAME,
        });

        await putStream(apiClient, FIRST_STREAM_NAME, {
          dashboards: [],
          queries: [],
          stream: {
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              processing: [
                {
                  grok: {
                    if: { always: {} },
                    field: 'message',
                    patterns: [
                      '%{TIMESTAMP_ISO8601:inner_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message2}',
                    ],
                  },
                },
              ],
              unwired: {},
            },
          },
        });

        const templateResponse = await esClient.indices.getIndexTemplate({
          name: TEMPLATE_NAME,
        });
        const template = templateResponse.index_templates[0];
        expect(template.index_template.template?.settings?.index?.default_pipeline).to.equal(
          'my-shared-template-pipeline'
        );

        const pipelineResponse = await esClient.ingest.getPipeline({
          id: `${TEMPLATE_NAME}-pipeline`,
        });
        const pipeline = pipelineResponse[`${TEMPLATE_NAME}-pipeline`];
        expect(pipeline._meta?.managed_by).to.eql('streams');
        expect(pipeline.processors?.[0].pipeline?.name).to.eql('mytest-first@stream.processing');
      });

      it('updates the ingest pipeline when the second stream is created', async () => {
        await esClient.indices.createDataStream({
          name: SECOND_STREAM_NAME,
        });

        await putStream(apiClient, SECOND_STREAM_NAME, {
          dashboards: [],
          queries: [],
          stream: {
            description: '',
            ingest: {
              lifecycle: { inherit: {} },
              processing: [
                {
                  grok: {
                    if: { always: {} },
                    field: 'message',
                    patterns: [
                      '%{TIMESTAMP_ISO8601:inner_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message2}',
                    ],
                  },
                },
              ],
              unwired: {},
            },
          },
        });

        const pipelineResponse = await esClient.ingest.getPipeline({
          id: `${TEMPLATE_NAME}-pipeline`,
        });
        const pipeline = pipelineResponse[`${TEMPLATE_NAME}-pipeline`];
        expect(pipeline.processors?.map((processor) => processor.pipeline?.name)).to.eql([
          'mytest-first@stream.processing',
          'mytest-second@stream.processing',
        ]);
      });

      it('updates the ingest pipeline when one of the streams is deleted', async () => {
        await apiClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: FIRST_STREAM_NAME,
            },
          },
        });

        const pipelineResponse = await esClient.ingest.getPipeline({
          id: `${TEMPLATE_NAME}-pipeline`,
        });
        const pipeline = pipelineResponse[`${TEMPLATE_NAME}-pipeline`];
        expect(pipeline.processors?.[0].pipeline?.name).to.eql('mytest-second@stream.processing');
      });

      it('deletes the ingest pipeline and restores the template when both streams are deleted', async () => {
        await apiClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: SECOND_STREAM_NAME,
            },
          },
        });

        const templateResponse = await esClient.indices.getIndexTemplate({
          name: TEMPLATE_NAME,
        });
        const template = templateResponse.index_templates[0];
        expect(template.index_template.template?.settings?.index?.default_pipeline).to.equal(
          undefined
        );

        try {
          await esClient.ingest.getPipeline({
            id: `${TEMPLATE_NAME}-pipeline`,
          });
          throw new Error('Expected to throw due to missing pipeline');
        } catch (error) {
          expect(isNotFoundError(error)).to.eql(true);
        }
      });
    });

    describe('Classic stream without pipeline', () => {
      const TEMPLATE_NAME = 'mytemplate';
      const DATA_STREAM_NAME = 'mytest-abc';

      before(async () => {
        await esClient.indices.putIndexTemplate({
          name: TEMPLATE_NAME,
          index_patterns: ['mytest*'],
          priority: 1000,
          template: {
            lifecycle: {
              data_retention: '7d',
            },
          },
          data_stream: {
            allow_custom_routing: false,
            hidden: false,
          },
        });

        await esClient.indices.createDataStream({
          name: DATA_STREAM_NAME,
        });
      });

      after(async () => {
        await apiClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: DATA_STREAM_NAME,
            },
          },
        });

        await esClient.indices.deleteIndexTemplate({
          name: TEMPLATE_NAME,
        });
      });

      it('Allows adding processing to classic streams without pipeline', async () => {
        const putResponse = await apiClient.fetch('PUT /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: DATA_STREAM_NAME,
            },
            body: {
              queries: [],
              dashboards: [],
              stream: {
                description: '',
                ingest: {
                  lifecycle: { inherit: {} },
                  processing: [
                    {
                      grok: {
                        if: { always: {} },
                        field: 'message',
                        patterns: [
                          '%{TIMESTAMP_ISO8601:inner_timestamp} %{LOGLEVEL:log.level} %{GREEDYDATA:message2}',
                        ],
                      },
                    },
                  ],
                  unwired: {},
                },
              },
            },
          },
        });

        expect(putResponse.status).to.eql(200);
        expect(putResponse.body).to.have.property('acknowledged', true);
      });

      it('Executes processing on classic streams without pipeline', async () => {
        const doc = {
          '@timestamp': '2024-01-01T00:00:10.000Z',
          message: '2023-01-01T00:00:10.000Z error test',
        };
        const response = await indexDocument(esClient, DATA_STREAM_NAME, doc);
        expect(response.result).to.eql('created');

        const result = await fetchDocument(esClient, DATA_STREAM_NAME, response._id);
        expect(result._source).to.eql({
          '@timestamp': '2024-01-01T00:00:10.000Z',
          message: '2023-01-01T00:00:10.000Z error test',
          inner_timestamp: '2023-01-01T00:00:10.000Z',
          message2: 'test',
          log: {
            level: 'error',
          },
        });
      });
    });

    describe('Orphaned classic stream', () => {
      const ORPHANED_STREAM_NAME = 'logs-orphaned-default';

      before(async () => {
        const doc = {
          message: '2023-01-01T00:00:10.000Z error test',
        };
        const response = await indexDocument(esClient, ORPHANED_STREAM_NAME, doc);
        expect(response.result).to.eql('created');
        // PUT the stream to make sure it's a classic stream
        await apiClient.fetch('PUT /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: ORPHANED_STREAM_NAME,
            },
            body: {
              dashboards: [],
              queries: [],
              stream: {
                description: '',
                ingest: {
                  lifecycle: { inherit: {} },
                  processing: [],
                  unwired: {},
                },
              },
            },
          },
        });
        // delete the underlying data stream
        await esClient.indices.deleteDataStream({
          name: ORPHANED_STREAM_NAME,
        });
      });

      it('should still be able to fetch the stream', async () => {
        const getResponse = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: ORPHANED_STREAM_NAME,
            },
          },
        });
        expect(getResponse.status).to.eql(200);
      });

      it('should still be able to fetch the dashboards for the stream', async () => {
        const getResponse = await apiClient.fetch('GET /api/streams/{name}/dashboards 2023-10-31', {
          params: {
            path: {
              name: ORPHANED_STREAM_NAME,
            },
          },
        });
        expect(getResponse.status).to.eql(200);
      });

      it('should still be possible to call _details', async () => {
        const getResponse = await apiClient.fetch('GET /internal/streams/{name}/_details', {
          params: {
            path: {
              name: ORPHANED_STREAM_NAME,
            },
            query: {
              start: '2023-01-01T00:00:00.000Z',
              end: '2023-01-01T00:00:20.000Z',
            },
          },
        });
        expect(getResponse.status).to.eql(200);
      });

      it('same APIs should return 404 for actually non-existing streams', async () => {
        const getStreamResponse = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: 'non-existing-stream',
            },
          },
        });
        expect(getStreamResponse.status).to.eql(404);
        const getDashboardsResponse = await apiClient.fetch(
          'GET /api/streams/{name}/dashboards 2023-10-31',
          {
            params: {
              path: {
                name: 'non-existing-stream',
              },
            },
          }
        );
        expect(getDashboardsResponse.status).to.eql(404);
        const getDetailsResponse = await apiClient.fetch('GET /internal/streams/{name}/_details', {
          params: {
            path: {
              name: 'non-existing-stream',
            },
            query: {
              start: '2023-01-01T00:00:00.000Z',
              end: '2023-01-01T00:00:20.000Z',
            },
          },
        });
        expect(getDetailsResponse.status).to.eql(404);
      });

      it('should still return the stream on public listing API', async () => {
        const getResponse = await apiClient.fetch('GET /api/streams 2023-10-31');
        expect(getResponse.status).to.eql(200);
        const classicStream = getResponse.body.streams.find(
          (stream) => stream.name === ORPHANED_STREAM_NAME
        );
        expect(Streams.UnwiredStream.Definition.is(classicStream!)).to.be(true);
      });

      it('should still return the stream on internal listing API', async () => {
        const getResponse = await apiClient.fetch('GET /internal/streams');
        expect(getResponse.status).to.eql(200);
        const classicStream = getResponse.body.streams.find(
          (stream) => stream.stream.name === ORPHANED_STREAM_NAME
        );
        expect(Streams.UnwiredStream.Definition.is(classicStream!.stream)).to.be(true);
      });

      it('should allow deleting', async () => {
        const response = await apiClient.fetch('DELETE /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: ORPHANED_STREAM_NAME,
            },
          },
        });
        expect(response.status).to.eql(200);
      });
    });
  });
}
