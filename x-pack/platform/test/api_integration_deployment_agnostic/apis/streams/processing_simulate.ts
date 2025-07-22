/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import expect from '@kbn/expect';
import { ClientRequestParamsOf } from '@kbn/server-route-repository-utils';
import { StreamsRouteRepository } from '@kbn/streams-plugin/server';
import { disableStreams, enableStreams, forkStream, indexDocument } from './helpers/requests';
import { DeploymentAgnosticFtrProviderContext } from '../../ftr_provider_context';
import {
  StreamsSupertestRepositoryClient,
  createStreamsRepositoryAdminClient,
} from './helpers/repository_client';

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
      id: 'dissect-uuid',
      dissect: {
        field: 'body.text',
        pattern:
          '%{attributes.parsed_timestamp} %{attributes.parsed_level} %{attributes.parsed_message}',
        if: { always: {} },
      },
    };

    const basicGrokProcessor = {
      id: 'draft',
      grok: {
        field: 'body.text',
        patterns: [
          '%{TIMESTAMP_ISO8601:attributes.parsed_timestamp} %{LOGLEVEL:attributes.parsed_level} %{GREEDYDATA:attributes.parsed_message}',
        ],
        if: { always: {} },
      },
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
        if: {
          field: 'resource.attributes.host.name',
          operator: 'eq' as const,
          value: TEST_HOST,
        },
      });
    });

    after(async () => {
      await disableStreams(apiClient);
    });

    describe('Successful simulations', () => {
      it('should simulate additive processing', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: [basicGrokProcessor],
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
          processing: [basicGrokProcessor],
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
          processing: [
            basicDissectProcessor,
            {
              id: 'draft',
              grok: {
                field: 'attributes.parsed_message',
                patterns: ['%{IP:attributes.parsed_ip}'],
                if: { always: {} },
              },
            },
          ],
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
          processing: [
            basicDissectProcessor, // This processor will correctly extract fields
            {
              id: 'draft',
              grok: {
                field: 'attributes.parsed_message',
                patterns: ['%{TIMESTAMP_ISO8601:attributes.other_date}'], // This processor will fail, as won't match another date from the remaining message
                if: { always: {} },
              },
            },
          ],
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
          processing: [
            basicDissectProcessor, // This processor will correctly extract fields
            {
              id: 'draft',
              grok: {
                field: 'attributes.parsed_message',
                patterns: ['%{TIMESTAMP_ISO8601:attributes.other_date}'], // This processor will fail, as won't match another date from the remaining message
                if: { always: {} },
              },
            },
          ],
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
          processing: [
            basicDissectProcessor,
            {
              id: 'draft',
              grok: {
                field: 'attributes.parsed_message',
                patterns: ['%{IP:attributes.parsed_ip}'],
                if: { always: {} },
              },
            },
          ],
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
          processing: [
            {
              ...basicDissectProcessor,
              dissect: {
                ...basicDissectProcessor.dissect,
                if: { field: 'body.text', operator: 'contains', value: 'test' },
              },
            },
          ],
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
          processing: [
            basicDissectProcessor,
            {
              id: 'draft',
              grok: {
                field: 'attributes.parsed_message',
                patterns: [
                  '%{WORD:attributes.ignored_field} %{IP:attributes.parsed_ip} %{GREEDYDATA:attributes.parsed_message}',
                ], // Try overriding parsed_message previously computed by dissect
                if: { always: {} },
              },
            },
          ],
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
          processing: [
            basicDissectProcessor, // This processor will correctly extract fields
            {
              id: 'draft',
              grok: {
                field: 'attributes.parsed_message',
                patterns: ['%{TIMESTAMP_ISO8601:attributes.other_date}'], // This processor will fail, as won't match another date from the remaining message
                if: { always: {} },
              },
            },
          ],
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
          processing: [
            {
              id: 'draft',
              grok: {
                field: 'body.text',
                patterns: ['%{INVALID_PATTERN:field}'],
                if: { always: {} },
              },
            },
          ],
          documents: [createTestDocument('test message')],
        });

        const processorsMetrics = response.body.processors_metrics;
        const grokMetrics = processorsMetrics.draft;

        expect(grokMetrics.errors).to.eql([
          {
            processor_id: 'draft',
            type: 'generic_simulation_failure',
            message:
              "[patterns] Invalid regex pattern found in: [%{INVALID_PATTERN:field}]. Unable to find pattern [INVALID_PATTERN] in Grok's pattern dictionary",
          },
        ]);
      });

      it('should gracefully return errors related to non-namespaced fields', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: [
            {
              id: 'draft',
              grok: {
                field: 'body.text',
                patterns: ['%{WORD:abc}'],
                if: { always: {} },
              },
            },
          ],
          documents: [createTestDocument('test message')],
        });

        const processorsMetrics = response.body.processors_metrics;
        const grokMetrics = processorsMetrics.draft;

        expect(grokMetrics.errors).to.eql([
          {
            processor_id: 'draft',
            type: 'non_namespaced_fields_failure',
            message: 'The fields generated by the processor are not namespaced ECS fields: [abc]',
          },
        ]);
      });

      it('should correctly associate nested processors within Elasticsearch ingest pipeline', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: [
            {
              id: 'draft',
              manual_ingest_pipeline: {
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
                if: { always: {} },
              },
            },
          ],
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

      it('should gracefully return mappings simulation errors', async () => {
        const response = await simulateProcessingForStream(apiClient, 'logs.test', {
          processing: [
            {
              id: 'draft',
              grok: {
                field: 'body.text',
                patterns: ['%{TIMESTAMP_ISO8601:@timestamp}'],
                if: { always: {} },
              },
            },
          ],
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
            processing: [basicGrokProcessor],
            documents: [createTestDocument()],
            detected_fields: [
              { name: 'attributes.parsed_timestamp', type: 'boolean' }, // Incompatible type
            ],
          }
        );

        expect(detectedFieldsFailureResponse.body.documents[0].errors).to.eql([
          {
            type: 'field_mapping_failure',
            message: `Some field types might not be compatible with this document: [1:98] failed to parse field [attributes.parsed_timestamp] of type [boolean] in document with id '0'. Preview of field's value: '${TEST_TIMESTAMP}'`,
          },
        ]);
        expect(detectedFieldsFailureResponse.body.documents[0].status).to.be('failed');
      });
    });
  });
}
