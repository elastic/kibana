/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ClientRequestParamsOf } from '@kbn/server-route-repository-utils';
import type { StreamsRouteRepository } from '@kbn/streams-plugin/server';
import { disableStreams, enableStreams, forkStream, indexDocument } from './helpers/requests';
import type { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import type { StreamsSupertestRepositoryClient } from './helpers/repository_client';
import { createStreamsRepositoryAdminClient } from './helpers/repository_client';

async function simulateProcessingForStream(
  client: StreamsSupertestRepositoryClient,
  name: string,
  body: ClientRequestParamsOf<
    StreamsRouteRepository,
    'POST /internal/streams/{name}/processing/_simulate'
  >['params']['body'],
  statusCode = 200
) {
  return client
    .fetch('POST /internal/streams/{name}/processing/_simulate', {
      params: {
        path: { name },
        body,
      },
    })
    .expect(statusCode);
}

export default function ({ getService }: DeploymentAgnosticFtrProviderContext) {
  const roleScopedSupertest = getService('roleScopedSupertest');
  const esClient = getService('es');

  let apiClient: StreamsSupertestRepositoryClient;

  describe('Processing Simulation', () => {
    const TEST_TIMESTAMP = '2025-01-01T00:00:10.000Z';
    const TEST_MESSAGE = `${TEST_TIMESTAMP} error test`;
    const TEST_HOST = 'test-host';

    const testDoc = {
      '@timestamp': TEST_TIMESTAMP,
      'body.text': TEST_MESSAGE,
      'resource.attributes.host.name': TEST_HOST,
      severity_text: 'error',
    };

    const basicDissectProcessor = {
      customIdentifier: 'dissect-uuid',
      action: 'dissect' as const,
      from: 'body.text',
      pattern:
        '%{attributes.parsed_timestamp} %{attributes.parsed_level} %{attributes.parsed_message}',
      where: { always: {} },
    };

    const basicGrokProcessor = {
      customIdentifier: 'draft',
      action: 'grok' as const,
      from: 'body.text',
      patterns: [
        '%{TIMESTAMP_ISO8601:attributes.parsed_timestamp} %{LOGLEVEL:attributes.parsed_level} %{GREEDYDATA:attributes.parsed_message}',
      ],
      where: { always: {} },
    };

    const createTestDocument = (message = TEST_MESSAGE) => ({
      '@timestamp': TEST_TIMESTAMP,
      'body.text': message,
    });

    before(async () => {
      apiClient = await createStreamsRepositoryAdminClient(roleScopedSupertest);

      await enableStreams(apiClient);

      // Create a test document
      await indexDocument(esClient, 'logs', testDoc);

      // Create a forked stream for testing
      await forkStream(apiClient, 'logs', {
        stream: {
          name: 'logs.test',
        },
        where: {
          field: 'resource.attributes.host.name',
          eq: TEST_HOST,
        },
        status: 'enabled',
      });
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('Successful simulations', () => {
      it('should simulate additive processing', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: {
            steps: [basicGrokProcessor],
          },
          documents: [createTestDocument()],
        });

        expect(response.body.documents_metrics.parsed_rate).to.be(1);
        expect(response.body.documents_metrics.failed_rate).to.be(0);

        const { detected_fields, errors, status, value } = response.body.documents[0];
        expect(status).to.be('parsed');
        expect(errors).to.eql([]);
        expect(detected_fields).to.eql([
          { processor_id: 'draft', name: 'attributes.parsed_level' },
          { processor_id: 'draft', name: 'attributes.parsed_message' },
          { processor_id: 'draft', name: 'attributes.parsed_timestamp' },
        ]);
        expect(value).to.have.property('attributes.parsed_level', 'error');
        expect(value).to.have.property('attributes.parsed_message', 'test');
        expect(value).to.have.property('attributes.parsed_timestamp', TEST_TIMESTAMP);
      });

      it('should simulate with detected fields', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: { steps: [basicGrokProcessor] },
          documents: [createTestDocument()],
          detected_fields: [
            { name: 'attributes.parsed_timestamp', type: 'date' },
            { name: 'attributes.parsed_level', type: 'keyword' },
          ],
        });

        const findField = (name: string) =>
          response.body.detected_fields.find((f: { name: string }) => f.name === name);

        expect(response.body.detected_fields).to.have.length(3); // Including parsed_message
        expect(findField('attributes.parsed_timestamp')).to.have.property('type', 'date');
        expect(findField('attributes.parsed_level')).to.have.property('type', 'keyword');
      });

      it('should simulate multiple sequential processors', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: {
            steps: [
              basicDissectProcessor,
              {
                customIdentifier: 'draft',
                action: 'grok' as const,
                from: 'attributes.parsed_message',
                patterns: ['%{IP:attributes.parsed_ip}'],
                where: { always: {} },
              },
            ],
          },
          documents: [createTestDocument(`${TEST_MESSAGE} 127.0.0.1`)],
        });

        expect(response.body.documents_metrics.parsed_rate).to.be(1);
        expect(response.body.documents_metrics.failed_rate).to.be(0);

        const { detected_fields, status, value } = response.body.documents[0];
        expect(status).to.be('parsed');
        expect(detected_fields).to.eql([
          { processor_id: 'dissect-uuid', name: 'attributes.parsed_level' },
          { processor_id: 'dissect-uuid', name: 'attributes.parsed_message' },
          { processor_id: 'dissect-uuid', name: 'attributes.parsed_timestamp' },
          { processor_id: 'draft', name: 'attributes.parsed_ip' },
        ]);
        expect(value).to.have.property('attributes.parsed_level', 'error');
        expect(value).to.have.property('attributes.parsed_message', 'test 127.0.0.1');
        expect(value).to.have.property('attributes.parsed_timestamp', TEST_TIMESTAMP);
        expect(value).to.have.property('attributes.parsed_ip', '127.0.0.1');
      });

      it('should simulate partially parsed documents', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: {
            steps: [
              basicDissectProcessor, // This processor will correctly extract fields
              {
                customIdentifier: 'draft',
                action: 'grok' as const,
                from: 'attributes.parsed_message',
                patterns: ['%{TIMESTAMP_ISO8601:attributes.other_date}'], // This processor will fail, as won't match another date from the remaining message
                where: { always: {} },
              },
            ],
          },

          documents: [createTestDocument(`${TEST_MESSAGE} 127.0.0.1`)],
        });

        expect(response.body.documents_metrics.parsed_rate).to.be(0);
        expect(response.body.documents_metrics.partially_parsed_rate).to.be(1);
        expect(response.body.documents_metrics.failed_rate).to.be(0);

        const { detected_fields, status, value } = response.body.documents[0];
        expect(status).to.be('partially_parsed');
        expect(detected_fields).to.eql([
          { processor_id: 'dissect-uuid', name: 'attributes.parsed_level' },
          { processor_id: 'dissect-uuid', name: 'attributes.parsed_message' },
          { processor_id: 'dissect-uuid', name: 'attributes.parsed_timestamp' },
        ]);
        expect(value).to.have.property('attributes.parsed_level', 'error');
        expect(value).to.have.property('attributes.parsed_message', 'test 127.0.0.1');
        expect(value).to.have.property('attributes.parsed_timestamp', TEST_TIMESTAMP);
      });

      it('should return processor metrics', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: {
            steps: [
              basicDissectProcessor, // This processor will correctly extract fields
              {
                customIdentifier: 'draft',
                action: 'grok' as const,
                from: 'attributes.parsed_message',
                patterns: ['%{TIMESTAMP_ISO8601:attributes.other_date}'], // This processor will fail, as won't match another date from the remaining message
                where: { always: {} },
              },
            ],
          },

          documents: [createTestDocument(`${TEST_MESSAGE} 127.0.0.1`)],
        });

        const processorsMetrics = response.body.processors_metrics;
        const dissectMetrics = processorsMetrics['dissect-uuid'];
        const grokMetrics = processorsMetrics.draft;

        expect(dissectMetrics.detected_fields).to.eql([
          'attributes.parsed_level',
          'attributes.parsed_message',
          'attributes.parsed_timestamp',
        ]);
        expect(dissectMetrics.errors).to.eql([]);
        expect(dissectMetrics.failed_rate).to.be(0);
        expect(dissectMetrics.parsed_rate).to.be(1);

        expect(grokMetrics.detected_fields).to.eql([]);
        expect(grokMetrics.errors).to.eql([
          {
            processor_id: 'draft',
            type: 'generic_processor_failure',
            message: 'Provided Grok expressions do not match field value: [test 127.0.0.1]',
          },
        ]);
        expect(grokMetrics.failed_rate).to.be(1);
        expect(grokMetrics.parsed_rate).to.be(0);
        expect(grokMetrics.skipped_rate).to.be(0);
      });

      it('should return accurate rates', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: {
            steps: [
              basicDissectProcessor,
              {
                customIdentifier: 'draft',
                action: 'grok' as const,
                from: 'attributes.parsed_message',
                patterns: ['%{IP:attributes.parsed_ip}'],
                where: { always: {} },
              },
            ],
          },
          documents: [
            createTestDocument(`${TEST_MESSAGE} 127.0.0.1`),
            createTestDocument(),
            createTestDocument(`${TEST_TIMESTAMP} info test`),
            createTestDocument('invalid format'),
          ],
        });

        expect(response.body.documents_metrics.parsed_rate).to.be(0.25);
        expect(response.body.documents_metrics.partially_parsed_rate).to.be(0.5);
        expect(response.body.documents_metrics.failed_rate).to.be(0.25);
        expect(response.body.documents).to.have.length(4);
        expect(response.body.documents[0].status).to.be('parsed');
        expect(response.body.documents[1].status).to.be('partially_parsed');
        expect(response.body.documents[2].status).to.be('partially_parsed');
        expect(response.body.documents[3].status).to.be('failed');

        const processorsMetrics = response.body.processors_metrics;
        const dissectMetrics = processorsMetrics['dissect-uuid'];
        const grokMetrics = processorsMetrics.draft;

        expect(dissectMetrics.failed_rate).to.be(0.25);
        expect(dissectMetrics.parsed_rate).to.be(0.75);
        expect(grokMetrics.failed_rate).to.be(0.75);
        expect(grokMetrics.parsed_rate).to.be(0.25);
      });

      it('should return metrics for skipped documents due to non-hit condition', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: {
            steps: [
              {
                ...basicDissectProcessor,
                where: { field: 'body.text', contains: 'test' },
              },
            ],
          },
          documents: [
            createTestDocument(`${TEST_TIMESTAMP} info test`),
            createTestDocument('invalid format'),
            createTestDocument('invalid format'),
            createTestDocument('invalid format'),
          ],
        });

        expect(response.body.documents_metrics.skipped_rate).to.be(0.75);
        expect(response.body.documents).to.have.length(4);
        expect(response.body.documents[0].status).to.be('parsed');
        expect(response.body.documents[1].status).to.be('skipped');
        expect(response.body.documents[2].status).to.be('skipped');
        expect(response.body.documents[3].status).to.be('skipped');

        const processorsMetrics = response.body.processors_metrics;
        const dissectMetrics = processorsMetrics['dissect-uuid'];

        expect(dissectMetrics.failed_rate).to.be(0);
        expect(dissectMetrics.parsed_rate).to.be(0.25);
        expect(dissectMetrics.skipped_rate).to.be(0.75);
      });

      it('should allow overriding fields detected by previous simulation processors', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: {
            steps: [
              basicDissectProcessor,
              {
                customIdentifier: 'draft',
                action: 'grok' as const,
                from: 'attributes.parsed_message',
                patterns: [
                  '%{WORD:attributes.ignored_field} %{IP:attributes.parsed_ip} %{GREEDYDATA:attributes.parsed_message}',
                ], // Try overriding parsed_message previously computed by dissect
                where: { always: {} },
              },
            ],
          },
          documents: [createTestDocument(`${TEST_MESSAGE} 127.0.0.1 greedy data message`)],
        });

        expect(response.body.documents_metrics.parsed_rate).to.be(1);
        expect(response.body.documents_metrics.failed_rate).to.be(0);

        const { detected_fields, status, value } = response.body.documents[0];
        expect(status).to.be('parsed');
        expect(detected_fields).to.eql([
          { processor_id: 'dissect-uuid', name: 'attributes.parsed_level' },
          { processor_id: 'dissect-uuid', name: 'attributes.parsed_message' },
          { processor_id: 'dissect-uuid', name: 'attributes.parsed_timestamp' },
          { processor_id: 'draft', name: 'attributes.ignored_field' },
          { processor_id: 'draft', name: 'attributes.parsed_ip' },
          { processor_id: 'draft', name: 'attributes.parsed_message' },
        ]);
        expect(value).to.have.property('attributes.parsed_message', 'greedy data message');
      });

      it('should gracefully return the errors for each partially parsed or failed document', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: {
            steps: [
              basicDissectProcessor, // This processor will correctly extract fields
              {
                customIdentifier: 'draft',
                action: 'grok' as const,
                from: 'attributes.parsed_message',
                patterns: ['%{TIMESTAMP_ISO8601:attributes.other_date}'], // This processor will fail, as won't match another date from the remaining message
                where: { always: {} },
              },
            ],
          },
          documents: [createTestDocument(`${TEST_MESSAGE} 127.0.0.1`)],
        });

        const { errors, status } = response.body.documents[0];
        expect(status).to.be('partially_parsed');
        expect(errors).to.eql([
          {
            processor_id: 'draft',
            type: 'generic_processor_failure',
            message: 'Provided Grok expressions do not match field value: [test 127.0.0.1]',
          },
        ]);
      });

      it('should gracefully return failed simulation errors', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: {
            steps: [
              {
                customIdentifier: 'draft',
                action: 'grok' as const,
                from: 'body.text',
                patterns: ['%{INVALID_PATTERN:attributes.field}'],
                where: { always: {} },
              },
            ],
          },
          documents: [createTestDocument('test message')],
        });

        const processorsMetrics = response.body.processors_metrics;
        const grokMetrics = processorsMetrics.draft;

        expect(grokMetrics.errors).to.eql([
          {
            processor_id: 'draft',
            type: 'generic_simulation_failure',
            message:
              "parse_exception\n\tRoot causes:\n\t\tparse_exception: [patterns] Invalid regex pattern found in: [%{INVALID_PATTERN:attributes.field}]. Unable to find pattern [INVALID_PATTERN] in Grok's pattern dictionary",
          },
        ]);
      });

      describe('manual_ingest_pipeline processor', () => {
        // manual_ingest_pipeline is only allowed in classic streams, not wired streams
        const CLASSIC_STREAM_NAME = 'logs-manual-pipeline-test-default';

        before(async () => {
          // Create a classic stream by indexing a document
          await indexDocument(esClient, CLASSIC_STREAM_NAME, {
            '@timestamp': TEST_TIMESTAMP,
            message: 'test message',
          });
        });

        after(async () => {
          await esClient.indices.deleteDataStream({ name: CLASSIC_STREAM_NAME });
        });

        it('should correctly associate nested processors within Elasticsearch ingest pipeline', async () => {
          const response = await simulateProcessingForStream(apiClient, CLASSIC_STREAM_NAME, {
            processing: {
              steps: [
                {
                  customIdentifier: 'draft',
                  action: 'manual_ingest_pipeline' as const,
                  processors: [
                    {
                      set: {
                        field: 'attributes.test',
                        value: 'test',
                      },
                    },
                    {
                      fail: {
                        message: 'Failing',
                      },
                    },
                  ],
                  where: { always: {} },
                },
              ],
            },
            documents: [createTestDocument('test message')],
          });

          const processorsMetrics = response.body.processors_metrics;
          const processorMetrics = processorsMetrics.draft;

          expect(processorMetrics.errors).to.eql([
            {
              processor_id: 'draft',
              type: 'generic_processor_failure',
              message: 'Failing',
            },
          ]);
        });
      });

      it('should gracefully return mappings simulation errors', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: {
            steps: [
              {
                customIdentifier: 'draft',
                action: 'grok' as const,
                from: 'body.text',
                patterns: ['%{TIMESTAMP_ISO8601:@timestamp}'],
                where: { always: {} },
              },
            ],
          },
          documents: [createTestDocument('2025-04-04 00:00:00,000')], // This date doesn't exactly match the mapping for @timestamp
        });

        expect(response.body.documents[0].errors).to.eql([
          {
            message:
              "Some field types might not be compatible with this document: [1:15] failed to parse field [@timestamp] of type [date] in document with id '0'. Preview of field's value: '2025-04-04 00:00:00,000'",
            type: 'field_mapping_failure',
          },
        ]);
        expect(response.body.documents[0].status).to.be('failed');

        // Simulate detected fields mapping issue
        const detectedFieldsFailureResponse = await simulateProcessingForStream(
          apiClient,
          'logs.test',
          {
            processing: {
              steps: [basicGrokProcessor],
            },
            documents: [createTestDocument()],
            detected_fields: [
              { name: 'attributes.parsed_timestamp', type: 'boolean' }, // Incompatible type
            ],
          }
        );

        expect(detectedFieldsFailureResponse.body.documents[0].errors).to.eql([
          {
            type: 'field_mapping_failure',
            message: `Some field types might not be compatible with this document: [1:66] failed to parse field [attributes.parsed_timestamp] of type [boolean] in document with id '0'. Preview of field's value: '${TEST_TIMESTAMP}'`,
          },
        ]);
        expect(detectedFieldsFailureResponse.body.documents[0].status).to.be('failed');
      });
    });

    describe('Geo point field handling', () => {
      const CLASSIC_STREAM_NAME = 'logs-geotest-default';

      before(async () => {
        // Create a sample document with geo point to establish the stream
        const sampleDoc = {
          '@timestamp': TEST_TIMESTAMP,
          message: 'test message',
          'source.geo.location': {
            lat: 40.7128,
            lon: -74.006,
          },
        };
        await indexDocument(esClient, CLASSIC_STREAM_NAME, sampleDoc);
      });

      after(async () => {
        await esClient.indices.deleteDataStream({ name: CLASSIC_STREAM_NAME });
      });

      // This test was added after ES issue #140506 was fixed (PR #141397).
      // Previously, Kibana had a workaround that suppressed geo.location ignored field errors
      // for OTEL streams. Now that the ES fix is in place, we should properly report any
      // ignored_fields errors that might occur, without suppressing geo.location specifically.
      it('should properly report ignored fields for geo.location in OTEL streams', async () => {
        // logs.test is a wired stream (OTEL stream) created in the parent describe's before hook
        // Test with geo.location field using OTEL semantic conventions (flattened format)
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: {
            steps: [
              {
                customIdentifier: 'draft',
                action: 'set' as const,
                to: 'attributes.processed',
                value: true,
                where: { always: {} },
              },
            ],
          },
          documents: [
            {
              '@timestamp': TEST_TIMESTAMP,
              'body.text': 'test with geo location',
              // geo.location field following OTEL semantic conventions (flattened)
              'resource.attributes.host.geo.location.lat': 40.7128,
              'resource.attributes.host.geo.location.lon': -74.006,
            },
          ],
        });

        // The simulation should succeed
        expect(response.body.documents_metrics.parsed_rate).to.be(1);
        expect(response.body.documents_metrics.failed_rate).to.be(0);

        const { errors, status, value } = response.body.documents[0];
        expect(status).to.be('parsed');
        // With the ES fix in place (PR #141397), geo.location fields should work correctly
        // without generating ignored_fields errors. Any errors that do occur should be
        // properly reported (not suppressed as before).
        expect(errors).to.eql([]);
        // Verify the geo.location fields are preserved in the output
        expect(value).to.have.property('resource.attributes.host.geo.location.lat', 40.7128);
        expect(value).to.have.property('resource.attributes.host.geo.location.lon', -74.006);
      });

      it('should correctly handle flattened geo point fields in simulation', async () => {
        const response = await simulateProcessingForStream(apiClient, CLASSIC_STREAM_NAME, {
          processing: {
            steps: [
              {
                customIdentifier: 'draft',
                action: 'grok' as const,
                from: 'message',
                patterns: ['%{WORD:parsed_field}'],
                where: { always: {} },
              },
            ],
          },
          documents: [
            {
              '@timestamp': TEST_TIMESTAMP,
              'source.geo.location.lat': 40.7128,
              'source.geo.location.lon': -74.006,
              message: 'test',
              'other.field': 'value',
            },
          ],
        });

        expect(response.body.documents_metrics.parsed_rate).to.be(1);
        expect(response.body.documents_metrics.failed_rate).to.be(0);

        const { errors, status, value } = response.body.documents[0];
        expect(status).to.be('parsed');
        expect(errors).to.eql([]);

        // Verify simulation succeeded without errors - geo points were regrouped internally
        // but the response should still show flattened fields
        expect(value).to.have.property('source.geo.location.lat', 40.7128);
        expect(value).to.have.property('source.geo.location.lon', -74.006);
        expect(value).to.have.property('other.field', 'value');
        expect(value).to.have.property('parsed_field', 'test');
      });

      it('should handle multiple geo point fields in the same document', async () => {
        const response = await simulateProcessingForStream(apiClient, CLASSIC_STREAM_NAME, {
          processing: {
            steps: [
              {
                customIdentifier: 'draft',
                action: 'grok' as const,
                from: 'message',
                patterns: ['%{WORD:parsed_field}'],
                where: { always: {} },
              },
            ],
          },
          documents: [
            {
              '@timestamp': TEST_TIMESTAMP,
              'source.geo.location.lat': 40.7128,
              'source.geo.location.lon': -74.006,
              'destination.geo.location.lat': 51.5,
              'destination.geo.location.lon': -0.125,
              message: 'test',
            },
          ],
        });

        expect(response.body.documents_metrics.parsed_rate).to.be(1);
        expect(response.body.documents_metrics.failed_rate).to.be(0);

        const { errors, status, value } = response.body.documents[0];
        expect(status).to.be('parsed');
        expect(errors).to.eql([]);

        // Verify simulation succeeded - geo points were regrouped internally during processing
        // but the response still shows them as flattened fields
        expect(value).to.have.property('source.geo.location.lat', 40.7128);
        expect(value).to.have.property('source.geo.location.lon', -74.006);
        expect(value).to.have.property('destination.geo.location.lat', 51.5);
        expect(value).to.have.property('destination.geo.location.lon', -0.125);
      });
    });

    describe('Temporary field handling', () => {
      // Tests for https://github.com/elastic/kibana/issues/248968
      // Temporary fields that are created and then deleted should NOT appear in detected_fields

      it('should NOT include temporary fields (created then deleted) in detected_fields', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: {
            steps: [
              {
                customIdentifier: 'set-temp-field',
                action: 'set' as const,
                to: 'attributes.temp_field',
                value: 'temporary_value',
                where: { always: {} },
              },
              {
                customIdentifier: 'remove-temp-field',
                action: 'remove' as const,
                from: 'attributes.temp_field',
                where: { always: {} },
              },
            ],
          },
          documents: [createTestDocument()],
        });

        expect(response.body.documents_metrics.parsed_rate).to.be(1);
        expect(response.body.documents_metrics.failed_rate).to.be(0);

        const { detected_fields, status, value } = response.body.documents[0];
        expect(status).to.be('parsed');

        // The temp_field should NOT be in detected_fields since it was deleted
        const tempFieldDetected = detected_fields.find(
          (f: { name: string }) => f.name === 'attributes.temp_field'
        );
        expect(tempFieldDetected).to.be(undefined);

        // The final document should NOT have the temp_field
        expect(value).to.not.have.property('attributes.temp_field');
      });

      it('should include fields that are created and kept in detected_fields', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: {
            steps: [
              {
                customIdentifier: 'set-permanent-field',
                action: 'set' as const,
                to: 'attributes.permanent_field',
                value: 'permanent_value',
                where: { always: {} },
              },
            ],
          },
          documents: [createTestDocument()],
        });

        expect(response.body.documents_metrics.parsed_rate).to.be(1);

        const { detected_fields, value } = response.body.documents[0];

        // The permanent_field SHOULD be in detected_fields
        const permanentFieldDetected = detected_fields.find(
          (f: { name: string }) => f.name === 'attributes.permanent_field'
        );
        expect(permanentFieldDetected).to.not.be(undefined);
        expect(permanentFieldDetected!.processor_id).to.be('set-permanent-field');

        // The final document should have the permanent_field
        expect(value).to.have.property('attributes.permanent_field', 'permanent_value');
      });

      it('should NOT include fields that are modified then deleted in detected_fields', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: {
            steps: [
              {
                customIdentifier: 'set-field',
                action: 'set' as const,
                to: 'attributes.temp_field',
                value: 'initial_value',
                where: { always: {} },
              },
              {
                customIdentifier: 'modify-field',
                action: 'set' as const,
                to: 'attributes.temp_field',
                value: 'modified_value',
                where: { always: {} },
              },
              {
                customIdentifier: 'remove-field',
                action: 'remove' as const,
                from: 'attributes.temp_field',
                where: { always: {} },
              },
            ],
          },
          documents: [createTestDocument()],
        });

        expect(response.body.documents_metrics.parsed_rate).to.be(1);

        const { detected_fields, value } = response.body.documents[0];

        // The temp_field should NOT be in detected_fields since it was deleted
        const tempFieldDetected = detected_fields.find(
          (f: { name: string }) => f.name === 'attributes.temp_field'
        );
        expect(tempFieldDetected).to.be(undefined);

        // The final document should NOT have the temp_field
        expect(value).to.not.have.property('attributes.temp_field');
      });

      it('should track per-processor fields even for temporary fields', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: {
            steps: [
              {
                customIdentifier: 'set-temp-field',
                action: 'set' as const,
                to: 'attributes.temp_field',
                value: 'temporary_value',
                where: { always: {} },
              },
              {
                customIdentifier: 'remove-temp-field',
                action: 'remove' as const,
                from: 'attributes.temp_field',
                where: { always: {} },
              },
            ],
          },
          documents: [createTestDocument()],
        });

        expect(response.body.documents_metrics.parsed_rate).to.be(1);

        // Per-processor metrics SHOULD still track that the first processor added the temp field
        const processorsMetrics = response.body.processors_metrics;
        const setProcessorMetrics = processorsMetrics['set-temp-field'];

        expect(setProcessorMetrics).to.not.be(undefined);
        expect(setProcessorMetrics!.detected_fields).to.contain('attributes.temp_field');
        expect(setProcessorMetrics!.parsed_rate).to.be(1);
      });

      it('should handle mixed temporary and permanent fields correctly', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: {
            steps: [
              {
                customIdentifier: 'set-fields',
                action: 'grok' as const,
                from: 'body.text',
                patterns: [
                  '%{TIMESTAMP_ISO8601:attributes.parsed_timestamp} %{WORD:attributes.temp_level} %{GREEDYDATA:attributes.parsed_message}',
                ],
                where: { always: {} },
              },
              {
                customIdentifier: 'remove-temp-level',
                action: 'remove' as const,
                from: 'attributes.temp_level',
                where: { always: {} },
              },
            ],
          },
          documents: [createTestDocument()],
        });

        expect(response.body.documents_metrics.parsed_rate).to.be(1);

        const { detected_fields, value } = response.body.documents[0];

        // temp_level should NOT be in detected_fields (created then deleted)
        const tempLevelDetected = detected_fields.find(
          (f: { name: string }) => f.name === 'attributes.temp_level'
        );
        expect(tempLevelDetected).to.be(undefined);

        // parsed_timestamp and parsed_message SHOULD be in detected_fields (kept)
        const timestampDetected = detected_fields.find(
          (f: { name: string }) => f.name === 'attributes.parsed_timestamp'
        );
        const messageDetected = detected_fields.find(
          (f: { name: string }) => f.name === 'attributes.parsed_message'
        );
        expect(timestampDetected).to.not.be(undefined);
        expect(messageDetected).to.not.be(undefined);

        // Final document should have permanent fields but not temp_level
        expect(value).to.have.property('attributes.parsed_timestamp', TEST_TIMESTAMP);
        expect(value).to.have.property('attributes.parsed_message', 'test');
        expect(value).to.not.have.property('attributes.temp_level');
      });
    });
  });
}
