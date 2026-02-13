/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { Streams, emptyAssets } from '@kbn/streams-schema';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import { disableStreams, enableStreams, putStream } from './helpers/requests';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;

  describe('Field mappings', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('Namespace field handling', () => {
      // This test verifies that adding fields to resource.attributes on child streams
      // doesn't break index sorting. The root stream's resource.attributes contains
      // required sort fields (host.name, service.name) that must be preserved when
      // child streams add their own fields to the same namespace.
      it('preserves index sort fields when child stream adds resource.attributes fields', async () => {
        await putStream(
          apiClient,
          'logs.resourcetest',
          {
            stream: {
              description: '',
              ingest: {
                lifecycle: { inherit: {} },
                processing: { steps: [] },
                settings: {},
                wired: {
                  routing: [],
                  fields: {
                    'resource.attributes.foo': { type: 'keyword' },
                  },
                },
                failure_store: { inherit: {} },
              },
            },
            ...emptyAssets,
          },
          200
        );

        // Verify the stream was created successfully
        // If sort fields were missing, the stream creation would have failed
        const streamResponse = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: 'logs.resourcetest',
            },
          },
        });
        expect(Streams.WiredStream.GetResponse.is(streamResponse.body)).to.be(true);

        // Verify the field is in the stream definition
        const streamDef = streamResponse.body as Streams.WiredStream.GetResponse;
        expect(streamDef.stream.ingest.wired.fields).to.have.property('resource.attributes.foo');
      });

      // This test verifies that hierarchical field names (e.g., attributes.foo and attributes.foo.bar)
      // can coexist without causing mapper_parsing_exception errors.
      it('handles hierarchical field names in attributes namespace', async () => {
        await putStream(
          apiClient,
          'logs.hierarchical',
          {
            stream: {
              description: '',
              ingest: {
                lifecycle: { inherit: {} },
                processing: { steps: [] },
                settings: {},
                wired: {
                  routing: [],
                  fields: {
                    'attributes.foo': { type: 'keyword' },
                    'attributes.foo.bar': { type: 'ip' },
                  },
                },
                failure_store: { inherit: {} },
              },
            },
            ...emptyAssets,
          },
          200
        );

        // Verify the stream was created successfully
        const streamResponse = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: 'logs.hierarchical',
            },
          },
        });
        expect(Streams.WiredStream.GetResponse.is(streamResponse.body)).to.be(true);

        // Verify both fields are in the stream definition
        const streamDef = streamResponse.body as Streams.WiredStream.GetResponse;
        expect(streamDef.stream.ingest.wired.fields).to.have.property('attributes.foo');
        expect(streamDef.stream.ingest.wired.fields).to.have.property('attributes.foo.bar');
      });

      it('handles fields across multiple namespace prefixes', async () => {
        await putStream(
          apiClient,
          'logs.multinamespace',
          {
            stream: {
              description: '',
              ingest: {
                lifecycle: { inherit: {} },
                processing: { steps: [] },
                settings: {},
                wired: {
                  routing: [],
                  fields: {
                    'attributes.foo': { type: 'keyword' },
                    'resource.attributes.bar': { type: 'keyword' },
                    'scope.attributes.baz': { type: 'keyword' },
                  },
                },
                failure_store: { inherit: {} },
              },
            },
            ...emptyAssets,
          },
          200
        );

        // Verify the stream was created successfully
        const streamResponse = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: 'logs.multinamespace',
            },
          },
        });
        expect(Streams.WiredStream.GetResponse.is(streamResponse.body)).to.be(true);

        // Verify all fields are present
        const streamDef = streamResponse.body as Streams.WiredStream.GetResponse;
        expect(streamDef.stream.ingest.wired.fields).to.have.property('attributes.foo');
        expect(streamDef.stream.ingest.wired.fields).to.have.property('resource.attributes.bar');
        expect(streamDef.stream.ingest.wired.fields).to.have.property('scope.attributes.baz');
      });
    });

    describe('Pre-mapped OTel fields (keepFields)', () => {
      // This test verifies that scope.name (a pre-mapped OTel field in keepFields)
      // can be used in child stream wired.fields without triggering validation errors.
      // See: https://github.com/elastic/streams-program/issues/364
      it('allows scope.name field in child stream wired.fields', async () => {
        await putStream(
          apiClient,
          'logs.scopename',
          {
            stream: {
              description: '',
              ingest: {
                lifecycle: { inherit: {} },
                processing: { steps: [] },
                settings: {},
                wired: {
                  routing: [],
                  fields: {
                    'scope.name': { type: 'keyword' },
                  },
                },
                failure_store: { inherit: {} },
              },
            },
            ...emptyAssets,
          },
          200
        );

        // Verify the stream was created successfully
        const streamResponse = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: 'logs.scopename',
            },
          },
        });
        expect(Streams.WiredStream.GetResponse.is(streamResponse.body)).to.be(true);

        // Verify the field is in the stream definition
        const streamDef = streamResponse.body as Streams.WiredStream.GetResponse;
        expect(streamDef.stream.ingest.wired.fields).to.have.property('scope.name');
      });

      // This test verifies that scope.name can be combined with other valid fields
      it('allows scope.name combined with namespace fields', async () => {
        await putStream(
          apiClient,
          'logs.scopecombined',
          {
            stream: {
              description: '',
              ingest: {
                lifecycle: { inherit: {} },
                processing: { steps: [] },
                settings: {},
                wired: {
                  routing: [],
                  fields: {
                    'scope.name': { type: 'keyword' },
                    'attributes.service.version': { type: 'keyword' },
                    'resource.attributes.deployment.environment': { type: 'keyword' },
                  },
                },
                failure_store: { inherit: {} },
              },
            },
            ...emptyAssets,
          },
          200
        );

        // Verify the stream was created successfully
        const streamResponse = await apiClient.fetch('GET /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: 'logs.scopecombined',
            },
          },
        });
        expect(Streams.WiredStream.GetResponse.is(streamResponse.body)).to.be(true);

        // Verify all fields are present
        const streamDef = streamResponse.body as Streams.WiredStream.GetResponse;
        expect(streamDef.stream.ingest.wired.fields).to.have.property('scope.name');
        expect(streamDef.stream.ingest.wired.fields).to.have.property('attributes.service.version');
        expect(streamDef.stream.ingest.wired.fields).to.have.property(
          'resource.attributes.deployment.environment'
        );
      });

      // This test verifies that non-namespaced, non-keepFields fields are still rejected
      it('rejects non-namespaced fields not in keepFields', async () => {
        const response = await putStream(
          apiClient,
          'logs.invalidfield',
          {
            stream: {
              description: '',
              ingest: {
                lifecycle: { inherit: {} },
                processing: { steps: [] },
                settings: {},
                wired: {
                  routing: [],
                  fields: {
                    'invalid.field': { type: 'keyword' },
                  },
                },
                failure_store: { inherit: {} },
              },
            },
            ...emptyAssets,
          },
          400
        );

        // Verify the error message indicates the field is not allowed
        expect(response.message).to.contain('invalid.field');
      });

      // This test verifies that fields like 'scope' (without .name) are still rejected
      // because they conflict with OTel base mappings
      it('rejects fields that conflict with OTel base mappings', async () => {
        const response = await putStream(
          apiClient,
          'logs.scopeconflict',
          {
            stream: {
              description: '',
              ingest: {
                lifecycle: { inherit: {} },
                processing: { steps: [] },
                settings: {},
                wired: {
                  routing: [],
                  fields: {
                    scope: { type: 'keyword' },
                  },
                },
                failure_store: { inherit: {} },
              },
            },
            ...emptyAssets,
          },
          400
        );

        // Verify the error message indicates the field conflicts with OTel aliases
        expect(response.message).to.contain('scope');
      });
    });
  });
}
