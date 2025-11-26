/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Streams, type RoutingStatus } from '@kbn/streams-schema';
import {
  deleteStream,
  disableStreams,
  enableStreams,
  forkStream,
  indexDocument,
} from './helpers/requests';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Streams Schema', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);

      const doc = {
        '@timestamp': '2024-01-01T00:00:10.000Z',
        message: '2023-01-01T00:00:10.000Z error test',
        ['some.field']: 'some value',
        ['another.field']: 'another value',
        lastField: 'last value',
        ['log.level']: 'warning',
      };

      await indexDocument(esClient, 'logs', doc);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('Unmapped fields API', () => {
      it('Returns unmapped fields', async () => {
        const response = await apiClient
          .fetch('GET /internal/streams/{name}/schema/unmapped_fields', {
            params: {
              path: {
                name: 'logs',
              },
            },
          })
          .expect(200);
        expect(response.body.unmappedFields).to.eql([
          'attributes.another.field',
          'attributes.lastField',
          'attributes.some.field',
        ]);
      });
    });

    describe('Fields simulation API', () => {
      it('Returns failure status when simulation would fail', async () => {
        const response = await apiClient.fetch(
          'POST /internal/streams/{name}/schema/fields_simulation',
          {
            params: {
              path: {
                name: 'logs',
              },
              body: {
                field_definitions: [{ name: 'body.text', type: 'boolean' }],
              },
            },
          }
        );

        expect(response.body.status).to.be('failure');
        expect(response.body.simulationError).to.be.a('string');
        expect(response.body.documentsWithRuntimeFieldsApplied).to.be(null);
      });
      it('Returns success status when simulation would succeed', async () => {
        const response = await apiClient.fetch(
          'POST /internal/streams/{name}/schema/fields_simulation',
          {
            params: {
              path: {
                name: 'logs',
              },
              body: {
                field_definitions: [{ name: 'body.text', type: 'keyword' }],
              },
            },
          }
        );

        expect(response.body.status).to.be('success');
        expect(response.body.simulationError).to.be(null);
        expect(response.body.documentsWithRuntimeFieldsApplied).length(1);
      });
      it('Returns unknown status when documents are missing and status cannot be determined', async () => {
        const forkBody = {
          stream: {
            name: 'logs.nginx',
          },
          where: {
            field: 'attributes.log.logger',
            eq: 'nginx',
          },
          status: 'enabled' as RoutingStatus,
        };

        await forkStream(apiClient, 'logs', forkBody);
        const response = await apiClient.fetch(
          'POST /internal/streams/{name}/schema/fields_simulation',
          {
            params: {
              path: {
                name: 'logs.nginx',
              },
              body: {
                field_definitions: [{ name: 'body.text', type: 'keyword' }],
              },
            },
          }
        );

        expect(response.body.status).to.be('unknown');
        expect(response.body.simulationError).to.be(null);
        expect(response.body.documentsWithRuntimeFieldsApplied).to.be(null);
      });
    });

    describe('Schema updates via PUT /api/streams/{name}/_ingest', () => {
      const CLASSIC_STREAM_NAME = 'logs-classic-schema-test';
      const WIRED_STREAM_NAME = 'logs.wired-schema-test';

      before(async () => {
        // Create a classic stream by indexing to a hyphen-separated data stream name
        await indexDocument(esClient, CLASSIC_STREAM_NAME, {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          message: 'test document for classic stream',
        });

        // Create a wired stream by forking from logs
        await forkStream(apiClient, 'logs', {
          stream: { name: WIRED_STREAM_NAME },
          where: { always: {} },
          status: 'enabled' as RoutingStatus,
        });
      });

      after(async () => {
        await deleteStream(apiClient, WIRED_STREAM_NAME);
        await deleteStream(apiClient, CLASSIC_STREAM_NAME);
      });

      it('Updates field mappings for classic streams', async () => {
        const response = await apiClient
          .fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
            params: {
              path: { name: CLASSIC_STREAM_NAME },
              body: {
                ingest: {
                  lifecycle: { inherit: {} },
                  processing: { steps: [] },
                  settings: {},
                  failure_store: { inherit: {} },
                  classic: {
                    field_overrides: {
                      'attributes.test_field': { type: 'keyword' },
                      'attributes.number_field': { type: 'long' },
                    },
                  },
                },
              },
            },
          })
          .expect(200);

        expect(response.body.acknowledged).to.be(true);

        // Verify field mappings were applied
        const getResponse = await apiClient
          .fetch('GET /api/streams/{name} 2023-10-31', {
            params: { path: { name: CLASSIC_STREAM_NAME } },
          })
          .expect(200);

        expect(Streams.ClassicStream.Definition.is(getResponse.body.stream)).to.be(true);
        const classicStream = getResponse.body.stream as Streams.ClassicStream.Definition;
        expect(classicStream.ingest.classic.field_overrides!['attributes.test_field']).to.eql({
          type: 'keyword',
        });
        expect(classicStream.ingest.classic.field_overrides!['attributes.number_field']).to.eql({
          type: 'long',
        });
      });

      it('Updates field mappings for wired streams', async () => {
        const response = await apiClient
          .fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
            params: {
              path: { name: WIRED_STREAM_NAME },
              body: {
                ingest: {
                  lifecycle: { inherit: {} },
                  processing: { steps: [] },
                  settings: {},
                  failure_store: { inherit: {} },
                  wired: {
                    fields: {
                      'attributes.wired_field': { type: 'keyword' },
                      'attributes.ip_field': { type: 'ip' },
                    },
                    routing: [],
                  },
                },
              },
            },
          })
          .expect(200);

        expect(response.body.acknowledged).to.be(true);

        // Verify field mappings were applied
        const getResponse = await apiClient
          .fetch('GET /api/streams/{name} 2023-10-31', {
            params: { path: { name: WIRED_STREAM_NAME } },
          })
          .expect(200);

        expect(Streams.WiredStream.Definition.is(getResponse.body.stream)).to.be(true);
        const wiredStream = getResponse.body.stream as Streams.WiredStream.Definition;
        expect(wiredStream.ingest.wired.fields['attributes.wired_field']).to.eql({
          type: 'keyword',
        });
        expect(wiredStream.ingest.wired.fields['attributes.ip_field']).to.eql({ type: 'ip' });
      });

      it('Removes field mappings when fields are cleared', async () => {
        // First add a field mapping
        await apiClient
          .fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
            params: {
              path: { name: CLASSIC_STREAM_NAME },
              body: {
                ingest: {
                  lifecycle: { inherit: {} },
                  processing: { steps: [] },
                  settings: {},
                  failure_store: { inherit: {} },
                  classic: {
                    field_overrides: {
                      'attributes.temp_field': { type: 'keyword' },
                    },
                  },
                },
              },
            },
          })
          .expect(200);

        // Then clear all field_overrides
        await apiClient
          .fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
            params: {
              path: { name: CLASSIC_STREAM_NAME },
              body: {
                ingest: {
                  lifecycle: { inherit: {} },
                  processing: { steps: [] },
                  settings: {},
                  failure_store: { inherit: {} },
                  classic: {
                    field_overrides: {},
                  },
                },
              },
            },
          })
          .expect(200);

        // Verify field mappings were removed
        const getResponse = await apiClient
          .fetch('GET /api/streams/{name} 2023-10-31', {
            params: { path: { name: CLASSIC_STREAM_NAME } },
          })
          .expect(200);

        expect(Streams.ClassicStream.Definition.is(getResponse.body.stream)).to.be(true);
        const classicStream = getResponse.body.stream as Streams.ClassicStream.Definition;
        expect(classicStream.ingest.classic.field_overrides ?? {}).to.eql({});
      });

      it('Supports advanced field parameters like copy_to', async () => {
        const response = await apiClient
          .fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
            params: {
              path: { name: CLASSIC_STREAM_NAME },
              body: {
                ingest: {
                  lifecycle: { inherit: {} },
                  processing: { steps: [] },
                  settings: {},
                  failure_store: { inherit: {} },
                  classic: {
                    field_overrides: {
                      'attributes.source_field': {
                        type: 'keyword',
                        copy_to: 'grouped_fields',
                      },
                    },
                  },
                },
              },
            },
          })
          .expect(200);

        expect(response.body.acknowledged).to.be(true);

        // Verify copy_to parameter was saved
        const getResponse = await apiClient
          .fetch('GET /api/streams/{name} 2023-10-31', {
            params: { path: { name: CLASSIC_STREAM_NAME } },
          })
          .expect(200);

        expect(Streams.ClassicStream.Definition.is(getResponse.body.stream)).to.be(true);
        const classicStream = getResponse.body.stream as Streams.ClassicStream.Definition;
        const sourceFieldOverride = classicStream.ingest.classic.field_overrides![
          'attributes.source_field'
        ] as any;
        expect(sourceFieldOverride.copy_to).to.eql('grouped_fields');
      });

      it('Returns error for invalid field type', async () => {
        const response = await apiClient.fetch('PUT /api/streams/{name}/_ingest 2023-10-31', {
          params: {
            path: { name: CLASSIC_STREAM_NAME },
            body: {
              ingest: {
                lifecycle: { inherit: {} },
                processing: { steps: [] },
                settings: {},
                failure_store: { inherit: {} },
                classic: {
                  field_overrides: {
                    'attributes.invalid_field': {
                      type: 'invalid_type' as unknown as 'keyword',
                    },
                  },
                },
              },
            },
          },
        });

        expect(response.status).to.be.greaterThan(399);
      });
    });
  });
}
