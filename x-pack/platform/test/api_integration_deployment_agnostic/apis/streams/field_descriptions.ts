/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { emptyAssets, type Streams } from '@kbn/streams-schema';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';
import { disableStreams, enableStreams, putStream, deleteStream } from './helpers/requests';

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  let apiClient: StreamsSupertestRepositoryClient;
  let supertestAdmin: Awaited<
    ReturnType<ReturnType<typeof roleScopedSupertest>['getSupertestWithRoleScope']>
  >;

  describe('Stream Field Descriptions', () => {
    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);
      // Get a supertest client with internal headers for the fields_metadata API
      supertestAdmin = await roleScopedSupertest.getSupertestWithRoleScope('admin', {
        withInternalHeaders: true,
      });
      await enableStreams(apiClient);
    });

    after(async () => {
      await disableStreams(apiClient);
      await supertestAdmin.destroy();
    });

    describe('fields_metadata API integration', () => {
      const STREAM_NAME = 'logs.field-descriptions-test';

      before(async () => {
        // Create a stream with field definitions
        // Note: Field descriptions will be supported after PR #250785 is merged
        const streamBody: Streams.WiredStream.UpsertRequest = {
          ...emptyAssets,
          stream: {
            description: 'Test stream for field metadata integration',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {
                  'attributes.custom_field': {
                    type: 'keyword',
                  },
                  'attributes.another_field': {
                    type: 'long',
                  },
                  'attributes.bool_field': {
                    type: 'boolean',
                  },
                },
                routing: [],
              },
              failure_store: { inherit: {} },
            },
          },
        };

        await putStream(apiClient, STREAM_NAME, streamBody);
      });

      after(async () => {
        await deleteStream(apiClient, STREAM_NAME);
      });

      it('returns field metadata for a stream via fields_metadata API', async () => {
        const response = await supertestAdmin
          .get(
            `/internal/fields_metadata?streamName=${STREAM_NAME}&fieldNames=attributes.custom_field,attributes.another_field,attributes.bool_field`
          )
          .set('Elastic-Api-Version', '1')
          .expect(200);

        expect(response.body).to.have.property('fields');

        // Check that custom_field is returned with correct type and source
        const customField = response.body.fields['attributes.custom_field'];
        expect(customField).to.be.ok();
        expect(customField.name).to.eql('attributes.custom_field');
        expect(customField.type).to.eql('keyword');
        expect(customField.source).to.eql('streams');

        // Check that another_field is returned with correct type and source
        const anotherField = response.body.fields['attributes.another_field'];
        expect(anotherField).to.be.ok();
        expect(anotherField.name).to.eql('attributes.another_field');
        expect(anotherField.type).to.eql('long');
        expect(anotherField.source).to.eql('streams');

        // Check that bool_field is returned with correct type and source
        const boolField = response.body.fields['attributes.bool_field'];
        expect(boolField).to.be.ok();
        expect(boolField.name).to.eql('attributes.bool_field');
        expect(boolField.type).to.eql('boolean');
        expect(boolField.source).to.eql('streams');
      });

      it('returns empty fields for non-existent stream', async () => {
        const response = await supertestAdmin
          .get(
            `/internal/fields_metadata?streamName=non-existent-stream&fieldNames=attributes.custom_field`
          )
          .set('Elastic-Api-Version', '1')
          .expect(200);

        expect(response.body).to.have.property('fields');
        // The field should not be found from the non-existent stream
        // It might be empty or fall back to other sources
        const customField = response.body.fields['attributes.custom_field'];
        // If no source has this field, it should be undefined or from a different source
        if (customField) {
          expect(customField.source).to.not.eql('streams');
        }
      });

      it('returns stream fields with highest priority over other sources', async () => {
        // Query for a field that is defined on the stream
        const response = await supertestAdmin
          .get(
            `/internal/fields_metadata?streamName=${STREAM_NAME}&fieldNames=attributes.custom_field`
          )
          .set('Elastic-Api-Version', '1')
          .expect(200);

        expect(response.body).to.have.property('fields');
        const customField = response.body.fields['attributes.custom_field'];
        expect(customField).to.be.ok();
        // Stream source should have highest priority
        expect(customField.source).to.eql('streams');
      });
    });

    describe('inherited field metadata', () => {
      const PARENT_STREAM = 'logs.parent-stream';
      const CHILD_STREAM = 'logs.parent-stream.child';

      before(async () => {
        // Create parent stream with field definitions
        const parentBody: Streams.WiredStream.UpsertRequest = {
          ...emptyAssets,
          stream: {
            description: 'Parent stream',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {
                  'attributes.inherited_field': {
                    type: 'keyword',
                  },
                },
                routing: [],
              },
              failure_store: { inherit: {} },
            },
          },
        };

        await putStream(apiClient, PARENT_STREAM, parentBody);

        // Create child stream with its own field
        const childBody: Streams.WiredStream.UpsertRequest = {
          ...emptyAssets,
          stream: {
            description: 'Child stream',
            ingest: {
              lifecycle: { inherit: {} },
              processing: { steps: [] },
              settings: {},
              wired: {
                fields: {
                  'attributes.child_field': {
                    type: 'keyword',
                  },
                },
                routing: [],
              },
              failure_store: { inherit: {} },
            },
          },
        };

        await putStream(apiClient, CHILD_STREAM, childBody);
      });

      after(async () => {
        await deleteStream(apiClient, CHILD_STREAM);
        await deleteStream(apiClient, PARENT_STREAM);
      });

      it('returns inherited field metadata for child stream', async () => {
        const response = await supertestAdmin
          .get(
            `/internal/fields_metadata?streamName=${CHILD_STREAM}&fieldNames=attributes.inherited_field,attributes.child_field`
          )
          .set('Elastic-Api-Version', '1')
          .expect(200);

        expect(response.body).to.have.property('fields');

        // Check inherited field from parent
        const inheritedField = response.body.fields['attributes.inherited_field'];
        expect(inheritedField).to.be.ok();
        expect(inheritedField.name).to.eql('attributes.inherited_field');
        expect(inheritedField.type).to.eql('keyword');
        expect(inheritedField.source).to.eql('streams');

        // Check child's own field
        const childField = response.body.fields['attributes.child_field'];
        expect(childField).to.be.ok();
        expect(childField.name).to.eql('attributes.child_field');
        expect(childField.type).to.eql('keyword');
        expect(childField.source).to.eql('streams');
      });
    });
  });
}
