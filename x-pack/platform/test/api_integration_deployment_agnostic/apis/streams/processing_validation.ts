/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { RoutingStatus, Streams } from '@kbn/streams-schema';
import { emptyAssets } from '@kbn/streams-schema';
import { disableStreams, enableStreams, forkStream, putStream } from './helpers/requests';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;

  describe('Processing Validation', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      await enableStreams(apiClient);
      const body = {
        stream: {
          name: 'logs.validation_test',
        },
        where: {
          field: 'resource.attributes.host.name',
          eq: 'validation-test',
        },
        status: 'enabled' as RoutingStatus,
      };
      // Create a forked stream for validation testing
      await forkStream(apiClient, 'logs', body);
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    it('should reject non-namespaced fields in wired streams', async () => {
      const body: Streams.WiredStream.UpsertRequest = {
        ...emptyAssets,
        stream: {
          description: '',
          ingest: {
            lifecycle: { inherit: {} },
            settings: {},
            processing: {
              steps: [
                {
                  action: 'set',
                  to: 'custom_field', // This should fail validation - not namespaced
                  value: 'test',
                  where: { always: {} },
                },
              ],
            },
            wired: {
              routing: [],
              fields: {},
            },
            failure_store: { inherit: {} },
          },
        },
      };

      const response = await apiClient
        .fetch('PUT /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: 'logs.validation_test',
            },
            body,
          },
        })
        .expect(400);

      expect(response.body).to.have.property('statusCode', 400);
      expect(response.body).to.have.property('error', 'Bad Request');
      // @ts-expect-error message exists on error responses
      expect(response.body.message).to.contain('custom_field');
      // @ts-expect-error message exists on error responses
      expect(response.body.message).to.contain('does not match the streams recommended schema');
    });

    it('should accept properly namespaced fields in wired streams', async () => {
      const body: Streams.WiredStream.UpsertRequest = {
        ...emptyAssets,
        stream: {
          description: '',
          ingest: {
            lifecycle: { inherit: {} },
            settings: {},
            processing: {
              steps: [
                {
                  action: 'set',
                  to: 'attributes.custom_field', // Properly namespaced
                  value: 'test',
                  where: { always: {} },
                },
              ],
            },
            wired: {
              routing: [],
              fields: {},
            },
            failure_store: { inherit: {} },
          },
        },
      };

      const response = await putStream(apiClient, 'logs.validation_test', body);
      expect(response).to.have.property('acknowledged', true);
    });

    it('should reject type mismatches in wired streams', async () => {
      const body: Streams.WiredStream.UpsertRequest = {
        ...emptyAssets,
        stream: {
          description: '',
          ingest: {
            lifecycle: { inherit: {} },
            settings: {},
            processing: {
              steps: [
                {
                  action: 'set',
                  to: 'attributes.test_field',
                  value: 123, // Number value
                  where: { always: {} },
                },
                {
                  action: 'grok', // Grok expects string, but test_field is number
                  from: 'attributes.test_field',
                  patterns: ['%{NUMBER:attributes.parsed}'],
                  where: { always: {} },
                },
              ],
            },
            wired: {
              routing: [],
              fields: {},
            },
            failure_store: { inherit: {} },
          },
        },
      };

      const response = await apiClient
        .fetch('PUT /api/streams/{name} 2023-10-31', {
          params: {
            path: {
              name: 'logs.validation_test',
            },
            body,
          },
        })
        .expect(400);

      expect(response.body).to.have.property('statusCode', 400);
      expect(response.body).to.have.property('error', 'Bad Request');
      // @ts-expect-error message exists on error responses
      expect(response.body.message).to.contain('attributes.test_field');
      // @ts-expect-error message exists on error responses
      expect(response.body.message).to.contain('type');
    });
  });
}
