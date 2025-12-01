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
          title: 'Test Integration',
          description: 'A test integration',
        });

        const integrationId = createResponse.integration_id;
        expect(integrationId).to.be.a('string');
        expect(integrationId).to.eql('test-integration');

        // Get all integrations
        const allIntegrations = await automaticImportV2Client.getAllIntegrations();
        expect(allIntegrations).to.be.an('array');
        expect(allIntegrations.length).to.be.greaterThan(0);

        const integration = allIntegrations.find((i) => i.integration_id === integrationId);
        expect(integration).to.be.ok();
        expect(integration?.title).to.eql('Test Integration');
        expect(integration?.description).to.eql('A test integration');
      });
    });

    describe('GET /api/automatic_import_v2/integrations/{integration_id}', function () {
      it('should return integration by id even without data streams', async function () {
        // Create an integration first
        const createResponse = await automaticImportV2Client.createIntegration({
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
        expect(response.integration).to.be.ok();
        expect(response.integration.integration_id).to.eql(integrationId);
        expect(response.integration.title).to.eql('Get By Id Test');
        expect(response.integration.description).to.eql('Testing get by id');
        expect(response.integration.logo).to.eql('data:image/png;base64,test');
      });

      it('should return error for non-existent integration', async function () {
        const res = await supertest
          .get('/api/automatic_import_v2/integrations/non-existent-id')
          .set('kbn-xsrf', 'true')
          .set('x-elastic-internal-origin', 'automatic-import-v2-test')
          .set(ELASTIC_HTTP_VERSION_HEADER, '1');
        expect(res.status).to.be(500);
      });
    });

    describe('PUT /api/automatic_import_v2/integrations', function () {
      it('should create a new integration without data streams', async function () {
        const integrationData = {
          title: 'New Integration',
          description: 'A new integration for testing',
          logo: 'data:image/png;base64,logo123',
        };

        const response = await automaticImportV2Client.createIntegration(integrationData);
        expect(response.integration_id).to.be.a('string');
        expect(response.integration_id).to.eql('new-integration');
      });
    });
  });
}
