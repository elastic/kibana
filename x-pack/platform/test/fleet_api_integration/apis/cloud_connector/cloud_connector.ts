/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { skipIfNoDockerRegistry } from '../../helpers';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('fleet_cloud_connectors', () => {
    skipIfNoDockerRegistry(providerContext);

    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    describe('POST /api/fleet/cloud_connectors - AWS and Azure', () => {
      it('should create an AWS cloud connector successfully', async () => {
        const response = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'arn:aws:iam::123456789012:role/test-role',
            cloudProvider: 'aws',
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/test-role', type: 'text' },
              external_id: {
                type: 'password',
                value: {
                  id: 'test1234567890123456',
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(200);
        const body = response.body;

        expect(body.item).to.have.property('id');
        expect(body.item.name).to.equal('arn:aws:iam::123456789012:role/test-role');
        expect(body.item.cloudProvider).to.equal('aws');
        expect(body.item.vars).to.have.property('role_arn');
        expect(body.item.vars).to.have.property('external_id');
        expect(body.item.packagePolicyCount).to.equal(1);
        expect(body.item).to.have.property('created_at');
        expect(body.item).to.have.property('updated_at');
      });

      it('should create an Azure cloud connector successfully', async () => {
        const response = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-azure-connector',
            cloudProvider: 'azure',
            vars: {
              tenant_id: {
                type: 'password',
                value: {
                  id: 'tenantId123456789012',
                  isSecretRef: true,
                },
              },
              client_id: {
                type: 'password',
                value: {
                  id: 'clientId123456789012',
                  isSecretRef: true,
                },
              },
              azure_credentials_cloud_connector_id: {
                value: 'azure-connector-id-12345',
                type: 'text',
              },
            },
          })
          .expect(200);
        const body = response.body;

        expect(body.item).to.have.property('id');
        expect(body.item.name).to.equal('azure-connector-id-12345');
        expect(body.item.cloudProvider).to.equal('azure');
        expect(body.item.vars).to.have.property('tenant_id');
        expect(body.item.vars).to.have.property('client_id');
        expect(body.item.vars).to.have.property('azure_credentials_cloud_connector_id');
        expect(body.item.packagePolicyCount).to.equal(1);
        expect(body.item).to.have.property('created_at');
        expect(body.item).to.have.property('updated_at');
      });

      it('should return 400 when external_id is missing for AWS', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'arn:aws:iam::123456789012:role/test-role',
            cloudProvider: 'aws',
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/test-role', type: 'text' },
            },
          })
          .expect(400);
      });

      it('should return 400 when role_arn is missing for AWS', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'arn:aws:iam::123456789012:role/test-role',
            cloudProvider: 'aws',
            vars: {
              external_id: {
                type: 'password',
                value: {
                  id: 'test1234567890123456',
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(400);
      });

      it('should return 400 when tenant_id is missing for Azure', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-azure-connector',
            cloudProvider: 'azure',
            vars: {
              client_id: {
                type: 'password',
                value: {
                  id: 'clientId123456789012',
                  isSecretRef: true,
                },
              },
              azure_credentials_cloud_connector_id: {
                value: 'azure-connector-id-12345',
                type: 'text',
              },
            },
          })
          .expect(400);
      });

      it('should return 400 when client_id is missing for Azure', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-azure-connector',
            cloudProvider: 'azure',
            vars: {
              tenant_id: {
                type: 'password',
                value: {
                  id: 'tenantId123456789012',
                  isSecretRef: true,
                },
              },
              azure_credentials_cloud_connector_id: {
                value: 'azure-connector-id-12345',
                type: 'text',
              },
            },
          })
          .expect(400);
      });

      it('should return 400 when azure_credentials_cloud_connector_id is missing for Azure', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-azure-connector',
            cloudProvider: 'azure',
            vars: {
              tenant_id: {
                type: 'password',
                value: {
                  id: 'tenantId123456789012',
                  isSecretRef: true,
                },
              },
              client_id: {
                type: 'password',
                value: {
                  id: 'clientId123456789012',
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(400);
      });

      it('should return 400 when name is missing', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            cloudProvider: 'aws',
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/test-role', type: 'text' },
              external_id: {
                type: 'password',
                value: {
                  id: 'test1234567890123456',
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(400);
      });

      it('should return 400 when cloudProvider is missing', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-connector',
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/test-role', type: 'text' },
            },
          })
          .expect(400);
      });

      it('should return 400 when vars is missing', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-connector',
            cloudProvider: 'aws',
          })
          .expect(400);
      });

      it('should return 400 when cloudProvider is invalid', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-connector',
            cloudProvider: 'invalid-provider',
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/test-role', type: 'text' },
            },
          })
          .expect(400);
      });

      it('should return 400 when external_id format is invalid - too short', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-aws-connector',
            cloudProvider: 'aws',
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/test-role', type: 'text' },
              external_id: {
                type: 'password',
                value: {
                  id: 'invalid-id', // Too short
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(400);
      });

      it('should return 400 when external_id format is invalid - too long', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-aws-connector',
            cloudProvider: 'aws',
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/test-role', type: 'text' },
              external_id: {
                type: 'password',
                value: {
                  id: 'invalid-id-that-is-way-too-long-for-the-20-character-limit',
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(400);
      });

      it('should return 400 when external_id format is invalid - contains special characters', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-aws-connector',
            cloudProvider: 'aws',
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/test-role', type: 'text' },
              external_id: {
                type: 'password',
                value: {
                  id: 'invalid-id-with-special-chars!@#',
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(400);
      });

      it('should return 400 when external_id format is invalid - contains spaces', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-aws-connector',
            cloudProvider: 'aws',
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/test-role', type: 'text' },
              external_id: {
                type: 'password',
                value: {
                  id: 'invalid id with spaces',
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(400);
      });

      it('should accept valid external_id with mixed case', async () => {
        const { body } = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'arn:aws:iam::123456789012:role/test-role',
            cloudProvider: 'aws',
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/test-role', type: 'text' },
              external_id: {
                type: 'password',
                value: {
                  id: 'aBcDeFgHiJkLmNoPqRsT', // Mixed case, 20 characters
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(200);

        expect(body.item).to.have.property('id');
        expect(body.item.name).to.equal('arn:aws:iam::123456789012:role/test-role');
        expect(body.item.vars.external_id.value).to.have.property('id', 'aBcDeFgHiJkLmNoPqRsT');
      });

      it('should return 400 when tenant_id is not a valid secret reference for Azure', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-azure-connector',
            cloudProvider: 'azure',
            vars: {
              tenant_id: {
                type: 'password',
                value: {
                  id: 'tenantId123456789012',
                  isSecretRef: false, // Invalid: should be true
                },
              },
              client_id: {
                type: 'password',
                value: {
                  id: 'clientId123456789012',
                  isSecretRef: true,
                },
              },
              azure_credentials_cloud_connector_id: {
                value: 'azure-connector-id-12345',
                type: 'text',
              },
            },
          })
          .expect(400);
      });

      it('should return 400 when client_id is not a valid secret reference for Azure', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-azure-connector',
            cloudProvider: 'azure',
            vars: {
              tenant_id: {
                type: 'password',
                value: {
                  id: 'tenantId123456789012',
                  isSecretRef: true,
                },
              },
              client_id: {
                type: 'password',
                value: {
                  id: 'clientId123456789012',
                  isSecretRef: false, // Invalid: should be true
                },
              },
              azure_credentials_cloud_connector_id: {
                value: 'azure-connector-id-12345',
                type: 'text',
              },
            },
          })
          .expect(400);
      });

      it('should accept valid Azure cloud connector with all required fields', async () => {
        const { body } = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-azure-connector-valid',
            cloudProvider: 'azure',
            vars: {
              tenant_id: {
                type: 'password',
                value: {
                  id: 'validTenantId1234567',
                  isSecretRef: true,
                },
              },
              client_id: {
                type: 'password',
                value: {
                  id: 'validClientId1234567',
                  isSecretRef: true,
                },
              },
              azure_credentials_cloud_connector_id: {
                value: 'azure-connector-valid-id',
                type: 'text',
              },
            },
          })
          .expect(200);

        expect(body.item).to.have.property('id');
        expect(body.item.name).to.equal('azure-connector-valid-id');
        expect(body.item.vars.tenant_id.value).to.have.property('id', 'validTenantId1234567');
        expect(body.item.vars.client_id.value).to.have.property('id', 'validClientId1234567');
        expect(body.item.vars.azure_credentials_cloud_connector_id.value).to.equal(
          'azure-connector-valid-id'
        );
      });
    });

    describe('GET /api/fleet/cloud_connectors - AWS and Azure', () => {
      let createdAwsConnectorId: string;
      let createdAzureConnectorId: string;

      before(async () => {
        // Create an AWS test connector for GET tests
        const awsResponse = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-get-connector',
            cloudProvider: 'aws',
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/test-role', type: 'text' },
              external_id: {
                type: 'password',
                value: {
                  id: 'aBcDeFg12JkLmNoPqRsT',
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(200);
        createdAwsConnectorId = awsResponse.body.item.id;

        // Create an Azure test connector for GET tests
        const azureResponse = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-get-azure-connector',
            cloudProvider: 'azure',
            vars: {
              tenant_id: {
                type: 'password',
                value: {
                  id: 'getTenantId123456789',
                  isSecretRef: true,
                },
              },
              client_id: {
                type: 'password',
                value: {
                  id: 'getClientId123456789',
                  isSecretRef: true,
                },
              },
              azure_credentials_cloud_connector_id: {
                value: 'test-get-azure-id',
                type: 'text',
              },
            },
          })
          .expect(200);
        createdAzureConnectorId = azureResponse.body.item.id;
      });

      it('should get list of cloud connectors including AWS', async () => {
        const { body } = await supertest.get(`/api/fleet/cloud_connectors`).expect(200);

        expect(body.items).to.be.an('array');
        expect(body.items.length).to.be.greaterThan(0);

        const connector = body.items.find((c: any) => c.id === createdAwsConnectorId);
        expect(connector).to.be.an('object');
        expect(connector.name).to.equal('arn:aws:iam::123456789012:role/test-role');
        expect(connector.cloudProvider).to.equal('aws');
        expect(connector.vars).to.have.property('role_arn');
        expect(connector.vars).to.have.property('external_id');
        expect(connector).to.have.property('packagePolicyCount');
        expect(connector).to.have.property('created_at');
        expect(connector).to.have.property('updated_at');
      });

      it('should get list of cloud connectors including Azure', async () => {
        const { body } = await supertest.get(`/api/fleet/cloud_connectors`).expect(200);

        expect(body.items).to.be.an('array');
        expect(body.items.length).to.be.greaterThan(0);

        const connector = body.items.find((c: any) => c.id === createdAzureConnectorId);
        expect(connector).to.be.an('object');
        expect(connector.name).to.equal('test-get-azure-id');
        expect(connector.cloudProvider).to.equal('azure');
        expect(connector.vars).to.have.property('tenant_id');
        expect(connector.vars).to.have.property('client_id');
        expect(connector.vars).to.have.property('azure_credentials_cloud_connector_id');
        expect(connector).to.have.property('packagePolicyCount');
        expect(connector).to.have.property('created_at');
        expect(connector).to.have.property('updated_at');
      });

      it('should return empty array when no connectors exist', async () => {
        // Clean up all saved objects to ensure no connectors exist
        await esArchiver.emptyKibanaIndex();

        const { body } = await supertest.get(`/api/fleet/cloud_connectors`).expect(200);

        expect(body.items).to.be.an('array');
        expect(body.items.length).to.equal(0);
      });

      it('should handle pagination parameters', async () => {
        const { body } = await supertest
          .get(`/api/fleet/cloud_connectors?page=1&perPage=10`)
          .expect(200);

        expect(body.items).to.be.an('array');
      });
    });

    describe('DELETE /api/fleet/cloud_connectors/{id} with force option - AWS and Azure', () => {
      let createdAwsConnectorId: string;
      let createdAzureConnectorId: string;

      beforeEach(async () => {
        // Create a fresh AWS test connector for each DELETE test
        const awsResponse = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-force-delete-connector',
            cloudProvider: 'aws',
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/force-delete-role', type: 'text' },
              external_id: {
                type: 'password',
                value: {
                  id: 'forceDeleteTestId123',
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(200);
        createdAwsConnectorId = awsResponse.body.item.id;

        // Create a fresh Azure test connector for each DELETE test
        const azureResponse = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-force-delete-azure-connector',
            cloudProvider: 'azure',
            vars: {
              tenant_id: {
                type: 'password',
                value: {
                  id: 'deleteTenantId123456',
                  isSecretRef: true,
                },
              },
              client_id: {
                type: 'password',
                value: {
                  id: 'deleteClientId123456',
                  isSecretRef: true,
                },
              },
              azure_credentials_cloud_connector_id: {
                value: 'test-delete-azure-id',
                type: 'text',
              },
            },
          })
          .expect(200);
        createdAzureConnectorId = azureResponse.body.item.id;
      });

      it('should delete AWS cloud connector successfully with force=false when packagePolicyCount is 1', async () => {
        // Verify connector exists and has packagePolicyCount = 1 (default for created connectors)
        const { body: getBody } = await supertest
          .get(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .expect(200);

        expect(getBody.item.packagePolicyCount).to.equal(1);

        // Delete should fail with force=false due to packagePolicyCount > 0
        await supertest
          .delete(`/api/fleet/cloud_connectors/${createdAwsConnectorId}?force=false`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);

        // Verify connector still exists
        await supertest.get(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`).expect(200);
      });

      it('should delete Azure cloud connector successfully with force=false when packagePolicyCount is 1', async () => {
        // Verify connector exists and has packagePolicyCount = 1 (default for created connectors)
        const { body: getBody } = await supertest
          .get(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`)
          .expect(200);

        expect(getBody.item.packagePolicyCount).to.equal(1);

        // Delete should fail with force=false due to packagePolicyCount > 0
        await supertest
          .delete(`/api/fleet/cloud_connectors/${createdAzureConnectorId}?force=false`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);

        // Verify connector still exists
        await supertest.get(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`).expect(200);
      });

      it('should delete AWS cloud connector successfully with force=true when packagePolicyCount > 0', async () => {
        // Verify connector exists and has packagePolicyCount = 1
        const { body: getBody } = await supertest
          .get(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .expect(200);

        expect(getBody.item.packagePolicyCount).to.equal(1);

        // Delete with force=true should succeed
        const { body } = await supertest
          .delete(`/api/fleet/cloud_connectors/${createdAwsConnectorId}?force=true`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(body).to.have.property('id', createdAwsConnectorId);

        // Verify connector is deleted
        await supertest.get(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`).expect(400);
      });

      it('should delete Azure cloud connector successfully with force=true when packagePolicyCount > 0', async () => {
        // Verify connector exists and has packagePolicyCount = 1
        const { body: getBody } = await supertest
          .get(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`)
          .expect(200);

        expect(getBody.item.packagePolicyCount).to.equal(1);

        // Delete with force=true should succeed
        const { body } = await supertest
          .delete(`/api/fleet/cloud_connectors/${createdAzureConnectorId}?force=true`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(body).to.have.property('id', createdAzureConnectorId);

        // Verify connector is deleted
        await supertest.get(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`).expect(400);
      });

      it('should delete AWS cloud connector successfully without force parameter when packagePolicyCount is 1 (should fail)', async () => {
        // Delete without force parameter should fail when packagePolicyCount > 0
        await supertest
          .delete(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);

        // Verify connector still exists
        await supertest.get(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`).expect(200);
      });

      it('should handle force parameter as string "true" for AWS', async () => {
        // Delete with force=true as string should succeed
        const { body } = await supertest
          .delete(`/api/fleet/cloud_connectors/${createdAwsConnectorId}?force=true`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(body).to.have.property('id', createdAwsConnectorId);

        // Verify connector is deleted
        await supertest.get(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`).expect(400);
      });

      it('should treat force=false as false for AWS', async () => {
        // Delete with force=false should fail when packagePolicyCount > 0
        await supertest
          .delete(`/api/fleet/cloud_connectors/${createdAwsConnectorId}?force=false`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);

        // Verify connector still exists
        await supertest.get(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`).expect(200);
      });

      it('should return appropriate error message when force=false and AWS connector is in use', async () => {
        const { body } = await supertest
          .delete(`/api/fleet/cloud_connectors/${createdAwsConnectorId}?force=false`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);

        expect(body.message).to.contain('being used by');
        expect(body.message).to.contain('package policies');
      });

      it('should return appropriate error message when force=false and Azure connector is in use', async () => {
        const { body } = await supertest
          .delete(`/api/fleet/cloud_connectors/${createdAzureConnectorId}?force=false`)
          .set('kbn-xsrf', 'xxxx')
          .expect(400);

        expect(body.message).to.contain('being used by');
        expect(body.message).to.contain('package policies');
      });

      afterEach(async () => {
        // Cleanup: force delete the connectors if they still exist
        try {
          await supertest
            .delete(`/api/fleet/cloud_connectors/${createdAwsConnectorId}?force=true`)
            .set('kbn-xsrf', 'xxxx');
        } catch (error) {
          // Connector might already be deleted
        }
        try {
          await supertest
            .delete(`/api/fleet/cloud_connectors/${createdAzureConnectorId}?force=true`)
            .set('kbn-xsrf', 'xxxx');
        } catch (error) {
          // Connector might already be deleted
        }
      });
    });

    describe('GET /api/fleet/cloud_connectors/{id} - AWS and Azure', () => {
      let createdAwsConnectorId: string;
      let createdAzureConnectorId: string;

      beforeEach(async () => {
        const awsResponse = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'arn:aws:iam::123456789012:role/get-by-id-role',
            cloudProvider: 'aws',
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/get-by-id-role', type: 'text' },
              external_id: {
                type: 'password',
                value: {
                  id: 'getByIdTestId1234567',
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(200);
        createdAwsConnectorId = awsResponse.body.item.id;

        const azureResponse = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-azure-get-by-id',
            cloudProvider: 'azure',
            vars: {
              tenant_id: {
                type: 'password',
                value: {
                  id: 'getByIdTenantId12345',
                  isSecretRef: true,
                },
              },
              client_id: {
                type: 'password',
                value: {
                  id: 'getByIdClientId12345',
                  isSecretRef: true,
                },
              },
              azure_credentials_cloud_connector_id: {
                value: 'azure-get-by-id-12345',
                type: 'text',
              },
            },
          })
          .expect(200);
        createdAzureConnectorId = azureResponse.body.item.id;
      });

      afterEach(async () => {
        try {
          await supertest
            .delete(`/api/fleet/cloud_connectors/${createdAwsConnectorId}?force=true`)
            .set('kbn-xsrf', 'xxxx');
        } catch (error) {
          // Connector might already be deleted
        }
        try {
          await supertest
            .delete(`/api/fleet/cloud_connectors/${createdAzureConnectorId}?force=true`)
            .set('kbn-xsrf', 'xxxx');
        } catch (error) {
          // Connector might already be deleted
        }
      });

      it('should get AWS cloud connector by id successfully', async () => {
        const { body } = await supertest
          .get(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .expect(200);

        expect(body.item).to.have.property('id', createdAwsConnectorId);
        expect(body.item).to.have.property('name', 'arn:aws:iam::123456789012:role/get-by-id-role');
        expect(body.item).to.have.property('cloudProvider', 'aws');
        expect(body.item).to.have.property('packagePolicyCount', 1);
        expect(body.item).to.have.property('created_at');
        expect(body.item).to.have.property('updated_at');
        expect(body.item.vars).to.have.property('role_arn');
        expect(body.item.vars.role_arn.value).to.equal(
          'arn:aws:iam::123456789012:role/get-by-id-role'
        );
        expect(body.item.vars).to.have.property('external_id');
        expect(body.item.vars.external_id.value).to.have.property('id', 'getByIdTestId1234567');
        expect(body.item.vars.external_id.value).to.have.property('isSecretRef', true);
      });

      it('should get Azure cloud connector by id successfully', async () => {
        const { body } = await supertest
          .get(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`)
          .expect(200);

        expect(body.item).to.have.property('id', createdAzureConnectorId);
        expect(body.item).to.have.property('name', 'azure-get-by-id-12345');
        expect(body.item).to.have.property('cloudProvider', 'azure');
        expect(body.item).to.have.property('packagePolicyCount', 1);
        expect(body.item).to.have.property('created_at');
        expect(body.item).to.have.property('updated_at');
        expect(body.item.vars).to.have.property('tenant_id');
        expect(body.item.vars.tenant_id.value).to.have.property('id', 'getByIdTenantId12345');
        expect(body.item.vars.tenant_id.value).to.have.property('isSecretRef', true);
        expect(body.item.vars).to.have.property('client_id');
        expect(body.item.vars.client_id.value).to.have.property('id', 'getByIdClientId12345');
        expect(body.item.vars.client_id.value).to.have.property('isSecretRef', true);
        expect(body.item.vars).to.have.property('azure_credentials_cloud_connector_id');
        expect(body.item.vars.azure_credentials_cloud_connector_id.value).to.equal(
          'azure-get-by-id-12345'
        );
      });

      it('should return 400 for non-existent cloud connector id', async () => {
        const nonExistentId = 'non-existent-connector-id';
        const { body } = await supertest
          .get(`/api/fleet/cloud_connectors/${nonExistentId}`)
          .expect(400);

        expect(body).to.have.property('message');
        expect(body.message).to.match(/Failed to get cloud connector/);
      });

      it('should return 400 for invalid cloud connector id format', async () => {
        const invalidId = 'invalid-id-format!@#$%';
        const { body } = await supertest
          .get(`/api/fleet/cloud_connectors/${invalidId}`)
          .expect(400);

        expect(body).to.have.property('message');
      });
    });

    describe('PUT /api/fleet/cloud_connectors/{id} - AWS and Azure', () => {
      let createdAwsConnectorId: string;
      let createdAzureConnectorId: string;

      beforeEach(async () => {
        const awsResponse = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-update-connector',
            cloudProvider: 'aws',
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/original-role', type: 'text' },
              external_id: {
                type: 'password',
                value: {
                  id: 'originalTestId123456',
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(200);
        createdAwsConnectorId = awsResponse.body.item.id;

        const azureResponse = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-update-azure-connector',
            cloudProvider: 'azure',
            vars: {
              tenant_id: {
                type: 'password',
                value: {
                  id: 'originalTenantId1234',
                  isSecretRef: true,
                },
              },
              client_id: {
                type: 'password',
                value: {
                  id: 'originalClientId1234',
                  isSecretRef: true,
                },
              },
              azure_credentials_cloud_connector_id: {
                value: 'original-azure-id-12345',
                type: 'text',
              },
            },
          })
          .expect(200);
        createdAzureConnectorId = azureResponse.body.item.id;
      });

      afterEach(async () => {
        try {
          await supertest
            .delete(`/api/fleet/cloud_connectors/${createdAwsConnectorId}?force=true`)
            .set('kbn-xsrf', 'xxxx');
        } catch (error) {
          // Connector might already be deleted
        }
        try {
          await supertest
            .delete(`/api/fleet/cloud_connectors/${createdAzureConnectorId}?force=true`)
            .set('kbn-xsrf', 'xxxx');
        } catch (error) {
          // Connector might already be deleted
        }
      });

      it('should update AWS cloud connector name successfully', async () => {
        const updateData = {
          name: 'updated-aws-connector-name',
        };

        const { body } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(200);

        expect(body.item).to.have.property('id', createdAwsConnectorId);
        expect(body.item).to.have.property('name', 'updated-aws-connector-name');
        expect(body.item).to.have.property('cloudProvider', 'aws');
        expect(body.item).to.have.property('packagePolicyCount', 1);
        expect(body.item).to.have.property('updated_at');
        // Verify vars remain unchanged
        expect(body.item.vars.role_arn.value).to.equal(
          'arn:aws:iam::123456789012:role/original-role'
        );
        expect(body.item.vars.external_id.value.id).to.equal('originalTestId123456');
      });

      it('should update Azure cloud connector name successfully', async () => {
        const updateData = {
          name: 'updated-azure-connector-name',
        };

        const { body } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(200);

        expect(body.item).to.have.property('id', createdAzureConnectorId);
        expect(body.item).to.have.property('name', 'updated-azure-connector-name');
        expect(body.item).to.have.property('cloudProvider', 'azure');
        expect(body.item).to.have.property('packagePolicyCount', 1);
        expect(body.item).to.have.property('updated_at');
        // Verify vars remain unchanged
        expect(body.item.vars.tenant_id.value.id).to.equal('originalTenantId1234');
        expect(body.item.vars.client_id.value.id).to.equal('originalClientId1234');
        expect(body.item.vars.azure_credentials_cloud_connector_id.value).to.equal(
          'original-azure-id-12345'
        );
      });

      it('should update AWS cloud connector vars successfully', async () => {
        const updateData = {
          vars: {
            role_arn: { value: 'arn:aws:iam::123456789012:role/updated-role', type: 'text' },
            external_id: {
              type: 'password',
              value: {
                id: 'updatedTestId1234567',
                isSecretRef: true,
              },
            },
          },
        };

        const { body } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(200);

        expect(body.item).to.have.property('id', createdAwsConnectorId);
        expect(body.item).to.have.property('name', 'arn:aws:iam::123456789012:role/original-role');
        expect(body.item).to.have.property('cloudProvider', 'aws');
        expect(body.item).to.have.property('packagePolicyCount', 1);
        expect(body.item).to.have.property('updated_at');
        // Verify vars are updated
        expect(body.item.vars.role_arn.value).to.equal(
          'arn:aws:iam::123456789012:role/updated-role'
        );
        expect(body.item.vars.external_id.value.id).to.equal('updatedTestId1234567');
        expect(body.item.vars.external_id.value.isSecretRef).to.equal(true);
      });

      it('should update Azure cloud connector vars successfully', async () => {
        const updateData = {
          vars: {
            tenant_id: {
              type: 'password',
              value: {
                id: 'updatedTenantId12345',
                isSecretRef: true,
              },
            },
            client_id: {
              type: 'password',
              value: {
                id: 'updatedClientId12345',
                isSecretRef: true,
              },
            },
            azure_credentials_cloud_connector_id: {
              value: 'updated-azure-id-12345',
              type: 'text',
            },
          },
        };

        const { body } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(200);

        expect(body.item).to.have.property('id', createdAzureConnectorId);
        expect(body.item).to.have.property('name', 'original-azure-id-12345');
        expect(body.item).to.have.property('cloudProvider', 'azure');
        expect(body.item).to.have.property('packagePolicyCount', 1);
        expect(body.item).to.have.property('updated_at');
        // Verify vars are updated
        expect(body.item.vars.tenant_id.value.id).to.equal('updatedTenantId12345');
        expect(body.item.vars.client_id.value.id).to.equal('updatedClientId12345');
        expect(body.item.vars.azure_credentials_cloud_connector_id.value).to.equal(
          'updated-azure-id-12345'
        );
      });

      it('should update both name and vars successfully for AWS', async () => {
        const updateData = {
          name: 'fully-updated-aws-connector',
          vars: {
            role_arn: { value: 'arn:aws:iam::123456789012:role/fully-updated-role', type: 'text' },
            external_id: {
              type: 'password',
              value: {
                id: 'fullyUpdatedId123456',
                isSecretRef: true,
              },
            },
          },
        };

        const { body } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(200);

        expect(body.item).to.have.property('id', createdAwsConnectorId);
        expect(body.item).to.have.property('name', 'fully-updated-aws-connector');
        expect(body.item).to.have.property('cloudProvider', 'aws');
        expect(body.item).to.have.property('packagePolicyCount', 1);
        expect(body.item).to.have.property('updated_at');
        // Verify both name and vars are updated
        expect(body.item.vars.role_arn.value).to.equal(
          'arn:aws:iam::123456789012:role/fully-updated-role'
        );
        expect(body.item.vars.external_id.value.id).to.equal('fullyUpdatedId123456');
      });

      it('should update both name and vars successfully for Azure', async () => {
        const updateData = {
          name: 'fully-updated-azure-connector',
          vars: {
            tenant_id: {
              type: 'password',
              value: {
                id: 'fullyUpdatedTenantId',
                isSecretRef: true,
              },
            },
            client_id: {
              type: 'password',
              value: {
                id: 'fullyUpdatedClientId',
                isSecretRef: true,
              },
            },
            azure_credentials_cloud_connector_id: {
              value: 'fully-updated-azure-id',
              type: 'text',
            },
          },
        };

        const { body } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(200);

        expect(body.item).to.have.property('id', createdAzureConnectorId);
        expect(body.item).to.have.property('name', 'fully-updated-azure-connector');
        expect(body.item).to.have.property('cloudProvider', 'azure');
        expect(body.item).to.have.property('packagePolicyCount', 1);
        expect(body.item).to.have.property('updated_at');
        // Verify both name and vars are updated
        expect(body.item.vars.tenant_id.value.id).to.equal('fullyUpdatedTenantId');
        expect(body.item.vars.client_id.value.id).to.equal('fullyUpdatedClientId');
        expect(body.item.vars.azure_credentials_cloud_connector_id.value).to.equal(
          'fully-updated-azure-id'
        );
      });

      it('should handle empty update request for AWS', async () => {
        const updateData = {};

        const { body } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(200);

        expect(body.item).to.have.property('id', createdAwsConnectorId);
        expect(body.item).to.have.property('name', 'arn:aws:iam::123456789012:role/original-role');
        expect(body.item).to.have.property('cloudProvider', 'aws');
        expect(body.item).to.have.property('packagePolicyCount', 1);
        expect(body.item).to.have.property('updated_at');
        // Verify vars remain unchanged
        expect(body.item.vars.role_arn.value).to.equal(
          'arn:aws:iam::123456789012:role/original-role'
        );
        expect(body.item.vars.external_id.value.id).to.equal('originalTestId123456');
      });

      it('should validate AWS vars when updating', async () => {
        const updateData = {
          vars: {
            role_arn: { value: 'arn:aws:iam::123456789012:role/valid-role', type: 'text' },
            external_id: {
              type: 'password',
              value: {
                id: 'TOOSHORT', // Invalid: too short (less than 20 characters)
                isSecretRef: true,
              },
            },
          },
        };

        const { body } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(400);

        expect(body).to.have.property('message');
        expect(body.message).to.match(/External ID secret reference is not valid/);
      });

      it('should validate that role_arn is required when updating vars', async () => {
        const updateData = {
          vars: {
            external_id: {
              type: 'password',
              value: {
                id: 'validExternalId12345',
                isSecretRef: true,
              },
            },
            // Missing role_arn
          },
        };

        const { body } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(400);

        expect(body).to.have.property('message');
        expect(body.message).to.match(/Package policy must contain role_arn variable/);
      });

      it('should validate that external_id is required when updating AWS vars', async () => {
        const updateData = {
          vars: {
            role_arn: { value: 'arn:aws:iam::123456789012:role/valid-role', type: 'text' },
            // Missing external_id
          },
        };

        const { body } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(400);

        expect(body).to.have.property('message');
        expect(body.message).to.match(
          /Package policy must contain valid external_id secret reference/
        );
      });

      it('should validate that tenant_id is required when updating Azure vars', async () => {
        const updateData = {
          vars: {
            client_id: {
              type: 'password',
              value: {
                id: 'validClientId123456',
                isSecretRef: true,
              },
            },
            azure_credentials_cloud_connector_id: {
              value: 'valid-azure-id',
              type: 'text',
            },
            // Missing tenant_id
          },
        };

        const { body } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(400);

        expect(body).to.have.property('message');
        expect(body.message).to.match(/tenant_id must be a valid secret reference/);
      });

      it('should validate that client_id is required when updating Azure vars', async () => {
        const updateData = {
          vars: {
            tenant_id: {
              type: 'password',
              value: {
                id: 'validTenantId123456',
                isSecretRef: true,
              },
            },
            azure_credentials_cloud_connector_id: {
              value: 'valid-azure-id',
              type: 'text',
            },
            // Missing client_id
          },
        };

        const { body } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(400);

        expect(body).to.have.property('message');
        expect(body.message).to.match(/client_id must be a valid secret reference/);
      });

      it('should validate that azure_credentials_cloud_connector_id is required when updating Azure vars', async () => {
        const updateData = {
          vars: {
            tenant_id: {
              type: 'password',
              value: {
                id: 'validTenantId123456',
                isSecretRef: true,
              },
            },
            client_id: {
              type: 'password',
              value: {
                id: 'validClientId123456',
                isSecretRef: true,
              },
            },
            // Missing azure_credentials_cloud_connector_id
          },
        };

        const { body } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(400);

        expect(body).to.have.property('message');
        expect(body.message).to.match(
          /azure_credentials_cloud_connector_id must be a valid string/
        );
      });

      it('should return 400 for non-existent cloud connector id', async () => {
        const nonExistentId = 'non-existent-connector-id';
        const updateData = {
          name: 'updated-name',
        };

        const { body } = await supertest
          .put(`/api/fleet/cloud_connectors/${nonExistentId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(400);

        expect(body).to.have.property('message');
        expect(body.message).to.match(/Failed to update cloud connector/);
      });

      it('should return 400 for invalid role_arn format for AWS', async () => {
        const updateData = {
          vars: {
            role_arn: undefined,
            external_id: {
              type: 'password',
              value: {
                id: 'validExternalId12345',
                isSecretRef: true,
              },
            },
          },
        };

        const { body } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(400);

        expect(body).to.have.property('message');
        expect(body.message).to.match(/Package policy must contain role_arn variable/);
      });

      it('should preserve packagePolicyCount when updating AWS connector', async () => {
        // First verify current packagePolicyCount
        const { body: originalConnector } = await supertest
          .get(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .expect(200);

        expect(originalConnector.item.packagePolicyCount).to.equal(1);

        // Update the connector
        const updateData = {
          name: 'updated-aws-name-preserve-count',
        };

        const { body: updatedConnector } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(200);

        // Verify packagePolicyCount is preserved
        expect(updatedConnector.item.packagePolicyCount).to.equal(1);
        expect(updatedConnector.item.name).to.equal('updated-aws-name-preserve-count');
      });

      it('should preserve packagePolicyCount when updating Azure connector', async () => {
        // First verify current packagePolicyCount
        const { body: originalConnector } = await supertest
          .get(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`)
          .expect(200);

        expect(originalConnector.item.packagePolicyCount).to.equal(1);

        // Update the connector
        const updateData = {
          name: 'updated-azure-name-preserve-count',
        };

        const { body: updatedConnector } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(200);

        // Verify packagePolicyCount is preserved
        expect(updatedConnector.item.packagePolicyCount).to.equal(1);
        expect(updatedConnector.item.name).to.equal('updated-azure-name-preserve-count');
      });
    });
  });
}
