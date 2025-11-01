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

  describe('POST /internal/fleet/cloud_connector_with_package_policy', () => {
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

    describe('Successful creation scenarios', () => {
      afterEach(async () => {
        // Clean up created resources after each test
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it('should atomically create agent policy, AWS cloud connector, and package policy', async () => {
        const response = await supertest
          .post(`/internal/fleet/cloud_connector_with_package_policy`)
          .set('kbn-xsrf', 'xxxx')
          .set('elastic-api-version', '1')
          .send({
            name: 'Test Agentless Policy',
            namespace: 'default',
            description: 'Policy for testing atomic cloud connector creation',
            supports_agentless: true,
            cloud_connector: {
              name: 'Test AWS Connector',
              cloudProvider: 'aws',
              vars: {
                role_arn: {
                  type: 'text',
                  value: 'arn:aws:iam::123456789012:role/TestRole',
                },
                external_id: {
                  type: 'password',
                  value: 'ABCD1234567890EFGHIJ',
                },
              },
            },
            package_policy: {
              name: 'Test System Integration',
              namespace: 'default',
              enabled: true,
              package: {
                name: 'system',
                version: 'latest',
              },
              inputs: [],
            },
          })
          .expect(200);

        const body = response.body;

        // Verify response structure
        expect(body.item).to.have.property('agent_policy_id');
        expect(body.item).to.have.property('cloud_connector_id');
        expect(body.item).to.have.property('package_policy_id');

        const {
          agent_policy_id: agentPolicyId,
          cloud_connector_id: cloudConnectorId,
          package_policy_id: packagePolicyId,
        } = body.item;

        // Verify agent policy was created
        const agentPolicyResponse = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(agentPolicyResponse.body.item.name).to.equal('Test Agentless Policy');
        expect(agentPolicyResponse.body.item.supports_agentless).to.equal(true);

        // Verify cloud connector was created
        const cloudConnectorResponse = await supertest
          .get(`/api/fleet/cloud_connectors/${cloudConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(cloudConnectorResponse.body.item.name).to.equal('Test AWS Connector');
        expect(cloudConnectorResponse.body.item.cloudProvider).to.equal('aws');
        expect(cloudConnectorResponse.body.item.vars.role_arn.value).to.equal(
          'arn:aws:iam::123456789012:role/TestRole'
        );
        expect(cloudConnectorResponse.body.item.vars.external_id.value).to.have.property('id');
        expect(cloudConnectorResponse.body.item.vars.external_id.value.isSecretRef).to.equal(true);

        // Verify package policy was created
        const packagePolicyResponse = await supertest
          .get(`/api/fleet/package_policies/${packagePolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(packagePolicyResponse.body.item.name).to.equal('Test System Integration');
        expect(packagePolicyResponse.body.item.cloud_connector_id).to.equal(cloudConnectorId);
        expect(packagePolicyResponse.body.item.policy_ids).to.contain(agentPolicyId);

        // Verify secret was created in Elasticsearch
        const secretId = cloudConnectorResponse.body.item.vars.external_id.value.id;
        const secretsResponse = await es.transport.request({
          method: 'GET',
          path: `/_fleet/secret/${secretId}`,
        });

        expect(secretsResponse).to.have.property('value');
      });

      it('should handle Azure cloud connector with multiple secrets', async () => {
        const response = await supertest
          .post(`/internal/fleet/cloud_connector_with_package_policy`)
          .set('kbn-xsrf', 'xxxx')
          .set('elastic-api-version', '1')
          .send({
            name: 'Test Azure Agentless Policy',
            namespace: 'default',
            supports_agentless: true,
            cloud_connector: {
              name: 'Test Azure Connector',
              cloudProvider: 'azure',
              vars: {
                tenant_id: {
                  type: 'password',
                  value: 'test-tenant-id-12345',
                },
                client_id: {
                  type: 'password',
                  value: 'test-client-id-12345',
                },
                azure_credentials_cloud_connector_id: {
                  type: 'text',
                  value: 'creds-connector-id',
                },
              },
            },
            package_policy: {
              name: 'Test Azure Integration',
              namespace: 'default',
              enabled: true,
              package: {
                name: 'system',
                version: 'latest',
              },
              inputs: [],
            },
          })
          .expect(200);

        const { cloud_connector_id: cloudConnectorId } = response.body.item;

        // Verify Azure cloud connector with both secrets
        const cloudConnectorResponse = await supertest
          .get(`/api/fleet/cloud_connectors/${cloudConnectorId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(cloudConnectorResponse.body.item.cloudProvider).to.equal('azure');
        expect(cloudConnectorResponse.body.item.vars.tenant_id.value).to.have.property('id');
        expect(cloudConnectorResponse.body.item.vars.tenant_id.value.isSecretRef).to.equal(true);
        expect(cloudConnectorResponse.body.item.vars.client_id.value).to.have.property('id');
        expect(cloudConnectorResponse.body.item.vars.client_id.value.isSecretRef).to.equal(true);

        // Verify both secrets were created
        const tenantSecretId = cloudConnectorResponse.body.item.vars.tenant_id.value.id;
        const clientSecretId = cloudConnectorResponse.body.item.vars.client_id.value.id;

        const tenantSecretResponse = await es.transport.request({
          method: 'GET',
          path: `/_fleet/secret/${tenantSecretId}`,
        });
        expect(tenantSecretResponse).to.have.property('value');

        const clientSecretResponse = await es.transport.request({
          method: 'GET',
          path: `/_fleet/secret/${clientSecretId}`,
        });
        expect(clientSecretResponse).to.have.property('value');
      });

      it('should handle sys_monitoring query parameter', async () => {
        const response = await supertest
          .post(`/internal/fleet/cloud_connector_with_package_policy?sys_monitoring=true`)
          .set('kbn-xsrf', 'xxxx')
          .set('elastic-api-version', '1')
          .send({
            name: 'Test Policy with Monitoring',
            namespace: 'default',
            supports_agentless: true,
            cloud_connector: {
              name: 'Test Connector',
              cloudProvider: 'aws',
              vars: {
                role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/Role' },
                external_id: { type: 'password', value: 'ABCD1234567890EFGHIJ' },
              },
            },
            package_policy: {
              name: 'Test Integration',
              namespace: 'default',
              enabled: true,
              package: { name: 'system', version: 'latest' },
              inputs: [],
            },
          })
          .expect(200);

        const { agent_policy_id: agentPolicyId } = response.body.item;

        // Verify monitoring is enabled on agent policy
        const agentPolicyResponse = await supertest
          .get(`/api/fleet/agent_policies/${agentPolicyId}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(agentPolicyResponse.body.item.monitoring_enabled).to.be.an('array');
      });
    });

    describe('Validation and error handling', () => {
      afterEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it('should return 400 when agent policy name is missing', async () => {
        await supertest
          .post(`/internal/fleet/cloud_connector_with_package_policy`)
          .set('kbn-xsrf', 'xxxx')
          .set('elastic-api-version', '1')
          .send({
            namespace: 'default',
            supports_agentless: true,
            cloud_connector: {
              name: 'Test Connector',
              cloudProvider: 'aws',
              vars: {
                role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/Role' },
                external_id: { type: 'password', value: 'ABCD1234567890EFGHIJ' },
              },
            },
            package_policy: {
              name: 'Test Integration',
              namespace: 'default',
              enabled: true,
              package: { name: 'system', version: 'latest' },
              inputs: [],
            },
          })
          .expect(400);
      });

      it('should return 400 when cloud connector vars are invalid (AWS missing external_id)', async () => {
        await supertest
          .post(`/internal/fleet/cloud_connector_with_package_policy`)
          .set('kbn-xsrf', 'xxxx')
          .set('elastic-api-version', '1')
          .send({
            name: 'Test Policy',
            namespace: 'default',
            supports_agentless: true,
            cloud_connector: {
              name: 'Invalid AWS Connector',
              cloudProvider: 'aws',
              vars: {
                role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/Role' },
                // Missing external_id
              },
            },
            package_policy: {
              name: 'Test Integration',
              namespace: 'default',
              enabled: true,
              package: { name: 'system', version: 'latest' },
              inputs: [],
            },
          })
          .expect(400);
      });

      it('should return 400 when cloud connector vars are invalid (invalid external_id format)', async () => {
        await supertest
          .post(`/internal/fleet/cloud_connector_with_package_policy`)
          .set('kbn-xsrf', 'xxxx')
          .set('elastic-api-version', '1')
          .send({
            name: 'Test Policy',
            namespace: 'default',
            supports_agentless: true,
            cloud_connector: {
              name: 'Invalid AWS Connector',
              cloudProvider: 'aws',
              vars: {
                role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/Role' },
                external_id: { type: 'password', value: 'TOO-SHORT' }, // < 20 chars
              },
            },
            package_policy: {
              name: 'Test Integration',
              namespace: 'default',
              enabled: true,
              package: { name: 'system', version: 'latest' },
              inputs: [],
            },
          })
          .expect(400);
      });

      it('should return 400 when package policy package is invalid', async () => {
        await supertest
          .post(`/internal/fleet/cloud_connector_with_package_policy`)
          .set('kbn-xsrf', 'xxxx')
          .set('elastic-api-version', '1')
          .send({
            name: 'Test Policy',
            namespace: 'default',
            supports_agentless: true,
            cloud_connector: {
              name: 'Test Connector',
              cloudProvider: 'aws',
              vars: {
                role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/Role' },
                external_id: { type: 'password', value: 'ABCD1234567890EFGHIJ' },
              },
            },
            package_policy: {
              name: 'Test Integration',
              namespace: 'default',
              enabled: true,
              package: {
                name: 'non-existent-package',
                version: '99.99.99',
              },
              inputs: [],
            },
          })
          .expect(400);
      });
    });

    describe('Rollback scenarios', () => {
      afterEach(async () => {
        await kibanaServer.savedObjects.cleanStandardList();
      });

      it('should rollback all resources when package policy creation fails', async () => {
        // Create a request that will fail at package policy creation
        // (using invalid package info)
        const response = await supertest
          .post(`/internal/fleet/cloud_connector_with_package_policy`)
          .set('kbn-xsrf', 'xxxx')
          .set('elastic-api-version', '1')
          .send({
            name: 'Test Rollback Policy',
            namespace: 'default',
            supports_agentless: true,
            cloud_connector: {
              name: 'Test Rollback Connector',
              cloudProvider: 'aws',
              vars: {
                role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/Role' },
                external_id: { type: 'password', value: 'ABCD1234567890EFGHIJ' },
              },
            },
            package_policy: {
              name: 'Test Integration',
              namespace: 'default',
              enabled: true,
              package: {
                name: 'invalid-package-name',
                version: '1.0.0',
              },
              inputs: [],
            },
          })
          .expect(400);

        expect(response.body.message).to.contain('package');

        // Verify no agent policies were left behind
        const agentPoliciesResponse = await supertest
          .get(`/api/fleet/agent_policies`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const testPolicies = agentPoliciesResponse.body.items.filter((p: any) =>
          p.name.includes('Test Rollback Policy')
        );
        expect(testPolicies).to.have.length(0);

        // Verify no cloud connectors were left behind
        const cloudConnectorsResponse = await supertest
          .get(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const testConnectors = cloudConnectorsResponse.body.items.filter((c: any) =>
          c.name.includes('Test Rollback Connector')
        );
        expect(testConnectors).to.have.length(0);
      });
    });

    describe('Force flag behavior', () => {
      it('should respect force flag for duplicate policy names', async () => {
        // First create a policy
        const firstResponse = await supertest
          .post(`/internal/fleet/cloud_connector_with_package_policy`)
          .set('kbn-xsrf', 'xxxx')
          .set('elastic-api-version', '1')
          .send({
            name: 'Duplicate Name Policy',
            namespace: 'default',
            supports_agentless: true,
            cloud_connector: {
              name: 'First Connector',
              cloudProvider: 'aws',
              vars: {
                role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/Role1' },
                external_id: { type: 'password', value: 'ABCD1234567890EFGHIJ' },
              },
            },
            package_policy: {
              name: 'First Integration',
              namespace: 'default',
              enabled: true,
              package: { name: 'system', version: 'latest' },
              inputs: [],
            },
          })
          .expect(200);

        expect(firstResponse.body.item).to.have.property('agent_policy_id');

        // Try to create another with same name without force - should fail
        await supertest
          .post(`/internal/fleet/cloud_connector_with_package_policy`)
          .set('kbn-xsrf', 'xxxx')
          .set('elastic-api-version', '1')
          .send({
            name: 'Duplicate Name Policy',
            namespace: 'default',
            supports_agentless: true,
            cloud_connector: {
              name: 'Second Connector',
              cloudProvider: 'aws',
              vars: {
                role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/Role2' },
                external_id: { type: 'password', value: 'EFGH1234567890ABCDIJ' },
              },
            },
            package_policy: {
              name: 'Second Integration',
              namespace: 'default',
              enabled: true,
              package: { name: 'system', version: 'latest' },
              inputs: [],
            },
          })
          .expect(400);

        // Try again with force flag - should succeed
        const secondResponse = await supertest
          .post(`/internal/fleet/cloud_connector_with_package_policy`)
          .set('kbn-xsrf', 'xxxx')
          .set('elastic-api-version', '1')
          .send({
            name: 'Duplicate Name Policy',
            namespace: 'default',
            supports_agentless: true,
            force: true,
            cloud_connector: {
              name: 'Second Connector with Force',
              cloudProvider: 'aws',
              vars: {
                role_arn: { type: 'text', value: 'arn:aws:iam::123456789012:role/Role3' },
                external_id: { type: 'password', value: 'IJKL1234567890ABCDEF' },
              },
            },
            package_policy: {
              name: 'Second Integration with Force',
              namespace: 'default',
              enabled: true,
              package: { name: 'system', version: 'latest' },
              inputs: [],
            },
          })
          .expect(200);

        expect(secondResponse.body.item).to.have.property('agent_policy_id');
        expect(secondResponse.body.item.agent_policy_id).to.not.equal(
          firstResponse.body.item.agent_policy_id
        );
      });
    });
  });
}
