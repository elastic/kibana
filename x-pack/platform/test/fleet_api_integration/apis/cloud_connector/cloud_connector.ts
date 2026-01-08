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
  const es = getService('es');

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
      const createdConnectorIds: string[] = [];

      after(async () => {
        // Clean up all connectors created in this suite
        for (const id of createdConnectorIds) {
          try {
            await supertest
              .delete(`/api/fleet/cloud_connectors/${id}?force=true`)
              .set('kbn-xsrf', 'xxxx');
          } catch (error) {
            // Connector might already be deleted or not exist
          }
        }
      });

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
        expect(body.item).to.have.property('created_at');
        expect(body.item).to.have.property('updated_at');

        createdConnectorIds.push(body.item.id);
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
        expect(body.item.name).to.equal('test-azure-connector');
        expect(body.item.cloudProvider).to.equal('azure');
        expect(body.item.vars).to.have.property('tenant_id');
        expect(body.item.vars).to.have.property('client_id');
        expect(body.item.vars).to.have.property('azure_credentials_cloud_connector_id');
        expect(body.item).to.have.property('created_at');
        expect(body.item).to.have.property('updated_at');

        createdConnectorIds.push(body.item.id);
      });

      it('should return 400 when external_id is missing for AWS', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'arn:aws:iam::123456789012:role/test-role-missing-external-id',
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
            name: 'arn:aws:iam::123456789012:role/test-role-missing-role-arn',
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
            name: 'test-azure-connector-missing-tenant-id',
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
            name: 'test-azure-connector-missing-client-id',
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
            name: 'test-azure-connector-missing-cc-id',
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
            name: 'test-connector-missing-provider',
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
            name: 'test-connector-missing-vars',
            cloudProvider: 'aws',
          })
          .expect(400);
      });

      it('should return 400 when cloudProvider is invalid', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-connector-invalid-provider',
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
            name: 'test-aws-connector-too-short-external-id',
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
            name: 'test-aws-connector-too-long-external-id',
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
            name: 'test-aws-connector-special-chars-external-id',
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
            name: 'test-aws-connector-spaces-external-id',
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
            name: 'arn:aws:iam::123456789012:role/test-role-mixed-case',
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
        expect(body.item.name).to.equal('arn:aws:iam::123456789012:role/test-role-mixed-case');
        expect(body.item.vars.external_id.value).to.have.property('id', 'aBcDeFgHiJkLmNoPqRsT');

        createdConnectorIds.push(body.item.id);
      });

      it('should return 400 when tenant_id is not a valid secret reference for Azure', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-azure-connector-invalid-tenant-secret',
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
            name: 'test-azure-connector-invalid-client-secret',
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
        expect(body.item.name).to.equal('test-azure-connector-valid');
        expect(body.item.vars.tenant_id.value).to.have.property('id', 'validTenantId1234567');
        expect(body.item.vars.client_id.value).to.have.property('id', 'validClientId1234567');
        expect(body.item.vars.azure_credentials_cloud_connector_id.value).to.equal(
          'azure-connector-valid-id'
        );

        createdConnectorIds.push(body.item.id);
      });
    });

    describe('GET /api/fleet/cloud_connectors - AWS and Azure', () => {
      let createdAwsConnectorId: string;
      let createdAzureConnectorId: string;
      const testRunId = Date.now();

      before(async () => {
        // Create an AWS test connector for GET tests
        const awsResponse = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `arn:aws:iam::123456789012:role/test-get-role-${testRunId}`,
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
            name: `test-get-azure-connector-${testRunId}`,
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
        expect(connector.name).to.equal(
          `arn:aws:iam::123456789012:role/test-get-role-${testRunId}`
        );
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
        expect(connector.name).to.equal(`test-get-azure-connector-${testRunId}`);
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
            name: `test-force-delete-connector-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
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
            name: `test-force-delete-azure-connector-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
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

      it('should delete AWS cloud connector successfully with force=false when packagePolicyCount is 0', async () => {
        // Verify connector exists - packagePolicyCount is computed dynamically from actual package policies
        // Since no package policies reference this connector, packagePolicyCount should be 0
        const { body: getBody } = await supertest
          .get(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .expect(200);

        expect(getBody.item.packagePolicyCount).to.equal(0);

        // Delete should succeed with force=false when packagePolicyCount is 0
        const { body } = await supertest
          .delete(`/api/fleet/cloud_connectors/${createdAwsConnectorId}?force=false`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(body).to.have.property('id', createdAwsConnectorId);

        // Verify connector is deleted
        await supertest.get(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`).expect(400);
      });

      it('should delete Azure cloud connector successfully with force=false when packagePolicyCount is 0', async () => {
        // Verify connector exists - packagePolicyCount is computed dynamically from actual package policies
        // Since no package policies reference this connector, packagePolicyCount should be 0
        const { body: getBody } = await supertest
          .get(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`)
          .expect(200);

        expect(getBody.item.packagePolicyCount).to.equal(0);

        // Delete should succeed with force=false when packagePolicyCount is 0
        const { body } = await supertest
          .delete(`/api/fleet/cloud_connectors/${createdAzureConnectorId}?force=false`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(body).to.have.property('id', createdAzureConnectorId);

        // Verify connector is deleted
        await supertest.get(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`).expect(400);
      });

      it('should delete AWS cloud connector successfully with force=true', async () => {
        // Verify connector exists - packagePolicyCount is computed dynamically
        const { body: getBody } = await supertest
          .get(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .expect(200);

        expect(getBody.item.packagePolicyCount).to.equal(0);

        // Delete with force=true should succeed
        const { body } = await supertest
          .delete(`/api/fleet/cloud_connectors/${createdAwsConnectorId}?force=true`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(body).to.have.property('id', createdAwsConnectorId);

        // Verify connector is deleted
        await supertest.get(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`).expect(400);
      });

      it('should delete Azure cloud connector successfully with force=true', async () => {
        // Verify connector exists - packagePolicyCount is computed dynamically
        const { body: getBody } = await supertest
          .get(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`)
          .expect(200);

        expect(getBody.item.packagePolicyCount).to.equal(0);

        // Delete with force=true should succeed
        const { body } = await supertest
          .delete(`/api/fleet/cloud_connectors/${createdAzureConnectorId}?force=true`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(body).to.have.property('id', createdAzureConnectorId);

        // Verify connector is deleted
        await supertest.get(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`).expect(400);
      });

      it('should delete AWS cloud connector successfully without force parameter when packagePolicyCount is 0', async () => {
        // Delete without force parameter should succeed when packagePolicyCount = 0
        const { body } = await supertest
          .delete(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(body).to.have.property('id', createdAwsConnectorId);

        // Verify connector is deleted
        await supertest.get(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`).expect(400);
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

      it('should treat force=false as allowing delete when packagePolicyCount is 0', async () => {
        // Delete with force=false should succeed when packagePolicyCount = 0
        const { body } = await supertest
          .delete(`/api/fleet/cloud_connectors/${createdAwsConnectorId}?force=false`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(body).to.have.property('id', createdAwsConnectorId);

        // Verify connector is deleted
        await supertest.get(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`).expect(400);
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
      let createdAwsConnectorName: string;
      let createdAzureConnectorId: string;
      let createdAzureConnectorName: string;

      beforeEach(async () => {
        createdAwsConnectorName = `arn:aws:iam::123456789012:role/get-by-id-role-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const awsResponse = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: createdAwsConnectorName,
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

        createdAzureConnectorName = `test-azure-get-by-id-${Date.now()}-${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        const azureResponse = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: createdAzureConnectorName,
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
        expect(body.item).to.have.property('name', createdAwsConnectorName);
        expect(body.item).to.have.property('cloudProvider', 'aws');
        // packagePolicyCount is computed dynamically from actual package policies
        expect(body.item).to.have.property('packagePolicyCount', 0);
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
        expect(body.item).to.have.property('name', createdAzureConnectorName);
        expect(body.item).to.have.property('cloudProvider', 'azure');
        // packagePolicyCount is computed dynamically from actual package policies
        expect(body.item).to.have.property('packagePolicyCount', 0);
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
            name: `test-update-connector-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
            name: `test-update-azure-connector-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}`,
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
        // packagePolicyCount is computed dynamically from actual package policies
        expect(body.item).to.have.property('packagePolicyCount', 0);
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
        // packagePolicyCount is computed dynamically from actual package policies
        expect(body.item).to.have.property('packagePolicyCount', 0);
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
        expect(body.item).to.have.property('cloudProvider', 'aws');
        // packagePolicyCount is computed dynamically from actual package policies
        expect(body.item).to.have.property('packagePolicyCount', 0);
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
        expect(body.item).to.have.property('cloudProvider', 'azure');
        // packagePolicyCount is computed dynamically from actual package policies
        expect(body.item).to.have.property('packagePolicyCount', 0);
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
        // packagePolicyCount is computed dynamically from actual package policies
        expect(body.item).to.have.property('packagePolicyCount', 0);
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
        // packagePolicyCount is computed dynamically from actual package policies
        expect(body.item).to.have.property('packagePolicyCount', 0);
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
        expect(body.item).to.have.property('cloudProvider', 'aws');
        // packagePolicyCount is computed dynamically from actual package policies
        expect(body.item).to.have.property('packagePolicyCount', 0);
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
        // packagePolicyCount is computed dynamically from actual package policies
        // First verify current packagePolicyCount
        const { body: originalConnector } = await supertest
          .get(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .expect(200);

        expect(originalConnector.item.packagePolicyCount).to.equal(0);

        // Update the connector
        const updateData = {
          name: 'updated-aws-name-preserve-count',
        };

        const { body: updatedConnector } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAwsConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(200);

        // Verify packagePolicyCount is preserved (still 0 since no package policies reference this connector)
        expect(updatedConnector.item.packagePolicyCount).to.equal(0);
        expect(updatedConnector.item.name).to.equal('updated-aws-name-preserve-count');
      });

      it('should preserve packagePolicyCount when updating Azure connector', async () => {
        // packagePolicyCount is computed dynamically from actual package policies
        // First verify current packagePolicyCount
        const { body: originalConnector } = await supertest
          .get(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`)
          .expect(200);

        expect(originalConnector.item.packagePolicyCount).to.equal(0);

        // Update the connector
        const updateData = {
          name: 'updated-azure-name-preserve-count',
        };

        const { body: updatedConnector } = await supertest
          .put(`/api/fleet/cloud_connectors/${createdAzureConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .send(updateData)
          .expect(200);

        // Verify packagePolicyCount is preserved (still 0 since no package policies reference this connector)
        expect(updatedConnector.item.packagePolicyCount).to.equal(0);
        expect(updatedConnector.item.name).to.equal('updated-azure-name-preserve-count');
      });
    });

    describe('DELETE /api/fleet/cloud_connectors/{id} - Secret cleanup', () => {
      const SECRETS_INDEX_NAME = '.fleet-secrets';

      const createSecret = async (id: string, value: string) => {
        await es.index({
          index: SECRETS_INDEX_NAME,
          id,
          body: {
            value,
          },
          refresh: 'wait_for',
        });
      };

      const secretExists = async (id: string): Promise<boolean> => {
        try {
          await es.get({
            index: SECRETS_INDEX_NAME,
            id,
          });
          return true;
        } catch (err) {
          if (err.meta?.statusCode === 404) {
            return false;
          }
          throw err;
        }
      };

      afterEach(async () => {
        // Clean up any remaining secrets
        try {
          await es.deleteByQuery({
            index: SECRETS_INDEX_NAME,
            refresh: true,
            query: {
              match_all: {},
            },
          });
        } catch (err) {
          // Index might not exist, that's fine
        }
      });

      it('should delete AWS cloud connector secrets when connector is deleted', async () => {
        // External ID must be exactly 20 chars to match EXTERNAL_ID_REGEX validation /^[a-zA-Z0-9_-]{20}$/
        const timestamp = Date.now().toString();
        const externalIdSecretId = `awstest${timestamp.slice(-13)}`; // 'awstest' (7) + 13 digits = 20 chars
        const secretValue = 'test-external-id-value-123';

        // Create the secret in .fleet-secrets index
        await createSecret(externalIdSecretId, secretValue);

        // Verify secret exists
        expect(await secretExists(externalIdSecretId)).to.be(true);

        // Create AWS cloud connector with the secret reference
        const { body: createResponse } = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `aws-secret-cleanup-test-${Date.now()}`,
            cloudProvider: 'aws',
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/test-cleanup', type: 'text' },
              external_id: {
                type: 'password',
                value: {
                  id: externalIdSecretId,
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(200);

        const connectorId = createResponse.item.id;

        // Delete the cloud connector
        await supertest
          .delete(`/api/fleet/cloud_connectors/${connectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        // Verify the secret was deleted
        expect(await secretExists(externalIdSecretId)).to.be(false);
      });

      it('should delete Azure cloud connector secrets when connector is deleted', async () => {
        const tenantIdSecretId = `azure-tenant-cleanup-test-${Date.now()}`;
        const clientIdSecretId = `azure-client-cleanup-test-${Date.now()}`;
        const tenantSecretValue = 'test-tenant-id-value-456';
        const clientSecretValue = 'test-client-id-value-789';

        // Create the secrets in .fleet-secrets index
        await createSecret(tenantIdSecretId, tenantSecretValue);
        await createSecret(clientIdSecretId, clientSecretValue);

        // Verify secrets exist
        expect(await secretExists(tenantIdSecretId)).to.be(true);
        expect(await secretExists(clientIdSecretId)).to.be(true);

        // Create Azure cloud connector with the secret references
        const { body: createResponse } = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `azure-secret-cleanup-test-${Date.now()}`,
            cloudProvider: 'azure',
            vars: {
              tenant_id: {
                type: 'password',
                value: {
                  id: tenantIdSecretId,
                  isSecretRef: true,
                },
              },
              client_id: {
                type: 'password',
                value: {
                  id: clientIdSecretId,
                  isSecretRef: true,
                },
              },
              azure_credentials_cloud_connector_id: {
                value: 'test-azure-cleanup-id',
                type: 'text',
              },
            },
          })
          .expect(200);

        const connectorId = createResponse.item.id;

        // Delete the cloud connector
        await supertest
          .delete(`/api/fleet/cloud_connectors/${connectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        // Verify both secrets were deleted
        expect(await secretExists(tenantIdSecretId)).to.be(false);
        expect(await secretExists(clientIdSecretId)).to.be(false);
      });

      it('should delete secrets even when force deleting a connector', async () => {
        // External ID must be exactly 20 chars to match EXTERNAL_ID_REGEX validation /^[a-zA-Z0-9_-]{20}$/
        const timestamp = Date.now().toString();
        const externalIdSecretId = `forcedl${timestamp.slice(-13)}`; // 'forcedl' (7) + 13 digits = 20 chars
        const secretValue = 'test-force-delete-value';

        // Create the secret in .fleet-secrets index
        await createSecret(externalIdSecretId, secretValue);

        // Verify secret exists
        expect(await secretExists(externalIdSecretId)).to.be(true);

        // Create AWS cloud connector with the secret reference
        const { body: createResponse } = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: `aws-force-delete-test-${Date.now()}`,
            cloudProvider: 'aws',
            vars: {
              role_arn: { value: 'arn:aws:iam::123456789012:role/test-force', type: 'text' },
              external_id: {
                type: 'password',
                value: {
                  id: externalIdSecretId,
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(200);

        const connectorId = createResponse.item.id;

        // Force delete the cloud connector
        await supertest
          .delete(`/api/fleet/cloud_connectors/${connectorId}?force=true`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        // Verify the secret was deleted even with force=true
        expect(await secretExists(externalIdSecretId)).to.be(false);
      });
    });
  });
}
