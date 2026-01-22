/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import type { AutomaticImportV2ApiFtrProviderContext } from '../services/api';
import { createAutomaticImportV2ApiClient } from '../utils/automatic_import_v2_client';

export default function ({ getService }: AutomaticImportV2ApiFtrProviderContext) {
  const supertest = getService('supertest');
  const automaticImportV2Client = createAutomaticImportV2ApiClient(supertest);

  describe('Automatic Import V2 Integration Routes', function () {
    describe('GET /api/automatic_import_v2/integrations', function () {
      it('should return empty array when no integrations exist', async function () {
        const response = await automaticImportV2Client.getAllIntegrations();
        expect(response).to.be.an('array');
        expect(response.length).to.eql(0);
      });

      it('should return all integrations even without data streams', async function () {
        // Create an integration first
        const createResponse = await automaticImportV2Client.createIntegration({
          connectorId: 'test-connector-id',
          integrationId: 'test_integration',
          title: 'Test Integration',
          description: 'A test integration',
        });

        const integrationId = createResponse.integration_id;
        expect(integrationId).to.be.a('string');
        expect(integrationId).to.eql('test_integration');

        // Get all integrations
        const allIntegrations = await automaticImportV2Client.getAllIntegrations();
        expect(allIntegrations).to.be.an('array');
        expect(allIntegrations.length).to.be.greaterThan(0);

        const integration = allIntegrations.find((i) => i.integrationId === integrationId);
        expect(integration).to.be.ok();
        expect(integration?.title).to.eql('Test Integration');
        expect(integration?.totalDataStreamCount).to.eql(0);
        expect(integration?.successfulDataStreamCount).to.eql(0);
      });
    });

    describe('GET /api/automatic_import_v2/integrations/{integration_id}', function () {
      it('should return integration by id even without data streams', async function () {
        // Create an integration first
        const createResponse = await automaticImportV2Client.createIntegration({
          connectorId: 'test-connector-id',
          integrationId: 'get_by_id_test',
          title: 'Get By Id Test',
          description: 'Testing get by id',
          logo: 'data:image/png;base64,test',
        });

        const integrationId = createResponse.integration_id;
        if (!integrationId) {
          throw new Error('Integration ID is missing');
        }

        // Get the integration by id
        const response = await automaticImportV2Client.getIntegrationById(integrationId);
        expect(response.integrationResponse).to.be.ok();
        expect(response.integrationResponse.integrationId).to.eql(integrationId);
        expect(response.integrationResponse.title).to.eql('Get By Id Test');
        expect(response.integrationResponse.description).to.eql('Testing get by id');
        expect(response.integrationResponse.logo).to.eql('data:image/png;base64,test');
      });

      it('should return error for non-existent integration', async function () {
        const res = await supertest
          .get('/api/automatic_import_v2/integrations/non-existent-id')
          .set('kbn-xsrf', 'true')
          .set('x-elastic-internal-origin', 'automatic-import-v2-test')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1');
        expect(res.status).to.be(404);
      });
    });

    describe('PUT /api/automatic_import_v2/integrations', function () {
      it('should create a new integration without data streams', async function () {
        const integrationData = {
          connectorId: 'test-connector-id',
          integrationId: 'new_integration',
          title: 'New Integration',
          description: 'A new integration for testing',
          logo: 'data:image/png;base64,logo123',
        };

        const response = await automaticImportV2Client.createIntegration(integrationData);
        expect(response.integration_id).to.be.a('string');
        expect(response.integration_id).to.eql('new_integration');
      });

      it('should create an integration with a single data stream', async function () {
        const integrationData = {
          connectorId: 'test-connector-id',
          integrationId: 'integration_with_single_stream',
          title: 'Integration With Single Stream',
          description: 'Testing integration with one data stream',
          dataStreams: [
            {
              dataStreamId: 'access_logs',
              title: 'Access Logs',
              description: 'Web server access logs',
              inputTypes: [{ name: 'filestream' as const }],
            },
          ],
        };

        const response = await automaticImportV2Client.createIntegration(integrationData);
        expect(response.integration_id).to.be.a('string');
        expect(response.integration_id).to.eql('integration_with_single_stream');

        // Verify the integration and data stream were created
        const integrationId = response.integration_id;
        if (!integrationId) {
          throw new Error('Integration ID is missing');
        }

        const integration = await automaticImportV2Client.getIntegrationById(integrationId);
        expect(integration.integrationResponse.integrationId).to.eql(integrationId);
        expect(integration.integrationResponse.dataStreams).to.have.length(1);
        expect(integration.integrationResponse.dataStreams[0].title).to.eql('Access Logs');
        expect(integration.integrationResponse.dataStreams[0].description).to.eql(
          'Web server access logs'
        );
      });

      it('should create an integration with multiple data streams', async function () {
        const integrationData = {
          connectorId: 'test-connector-id',
          integrationId: 'multi_stream_integration',
          title: 'Multi Stream Integration',
          description: 'Testing integration with multiple data streams',
          logo: 'data:image/png;base64,multistream',
          dataStreams: [
            {
              dataStreamId: 'error_logs',
              title: 'Error Logs',
              description: 'Application error logs',
              inputTypes: [{ name: 'filestream' as const }],
            },
            {
              dataStreamId: 'metrics',
              title: 'Metrics',
              description: 'Application performance metrics',
              inputTypes: [{ name: 'http_endpoint' as const }],
            },
            {
              dataStreamId: 'security_events',
              title: 'Security Events',
              description: 'Security audit events',
              inputTypes: [{ name: 'aws-cloudwatch' as const }, { name: 'kafka' as const }],
            },
          ],
        };

        const response = await automaticImportV2Client.createIntegration(integrationData);
        expect(response.integration_id).to.be.a('string');
        expect(response.integration_id).to.eql('multi_stream_integration');

        // Verify the integration with all data streams
        const integrationId = response.integration_id;
        if (!integrationId) {
          throw new Error('Integration ID is missing');
        }

        const integration = await automaticImportV2Client.getIntegrationById(integrationId);
        expect(integration.integrationResponse.integrationId).to.eql(integrationId);
        expect(integration.integrationResponse.dataStreams).to.have.length(3);

        // Verify first data stream
        const errorLogStream = integration.integrationResponse.dataStreams.find(
          (ds) => ds.title === 'Error Logs'
        );
        expect(errorLogStream).to.be.ok();
        expect(errorLogStream?.description).to.eql('Application error logs');

        // Verify second data stream
        const metricsStream = integration.integrationResponse.dataStreams.find(
          (ds) => ds.title === 'Metrics'
        );
        expect(metricsStream).to.be.ok();
        expect(metricsStream?.description).to.eql('Application performance metrics');

        // Verify third data stream with multiple input types
        const securityStream = integration.integrationResponse.dataStreams.find(
          (ds) => ds.title === 'Security Events'
        );
        expect(securityStream).to.be.ok();
        expect(securityStream?.inputTypes).to.have.length(2);
      });

      it('should reflect data streams in the get all integrations endpoint', async function () {
        const integrationData = {
          connectorId: 'test-connector-id',
          integrationId: 'counted_streams_integration',
          title: 'Counted Streams Integration',
          description: 'Testing data stream counts',
          dataStreams: [
            {
              dataStreamId: 'stream_one',
              title: 'Stream One',
              description: 'First stream',
              inputTypes: [{ name: 'filestream' as const }],
            },
            {
              dataStreamId: 'stream_two',
              title: 'Stream Two',
              description: 'Second stream',
              inputTypes: [{ name: 'tcp' as const }],
            },
          ],
        };

        const createResponse = await automaticImportV2Client.createIntegration(integrationData);
        const integrationId = createResponse.integration_id;
        expect(integrationId).to.be.a('string');

        // Get all integrations and verify the data stream count
        const allIntegrations = await automaticImportV2Client.getAllIntegrations();
        const createdIntegration = allIntegrations.find((i) => i.integrationId === integrationId);
        expect(createdIntegration).to.be.ok();
        expect(createdIntegration?.totalDataStreamCount).to.eql(2);
      });

      it('should create integration with data stream from index source', async function () {
        const integrationData = {
          connectorId: 'test-connector-id',
          integrationId: 'index_source_integration',
          title: 'Index Source Integration',
          description: 'Testing data stream from index',
          dataStreams: [
            {
              dataStreamId: 'existing_index_logs',
              title: 'Existing Index Logs',
              description: 'Logs from existing Elasticsearch index',
              inputTypes: [{ name: 'kafka' as const }],
            },
          ],
        };

        const response = await automaticImportV2Client.createIntegration(integrationData);
        expect(response.integration_id).to.be.a('string');

        const integrationId = response.integration_id;
        if (!integrationId) {
          throw new Error('Integration ID is missing');
        }

        const integration = await automaticImportV2Client.getIntegrationById(integrationId);
        expect(integration.integrationResponse.dataStreams).to.have.length(1);
        expect(integration.integrationResponse.dataStreams[0].title).to.eql('Existing Index Logs');
      });
    });
  });
}
