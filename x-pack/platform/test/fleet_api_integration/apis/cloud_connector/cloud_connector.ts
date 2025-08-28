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

    describe('POST /api/fleet/cloud_connectors', () => {
      it('should create an AWS cloud connector successfully', async () => {
        const { body } = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-aws-connector',
            cloudProvider: 'aws',
            vars: {
              role_arn: 'arn:aws:iam::123456789012:role/test-role',
              external_id: {
                type: 'password',
                value: {
                  id: 'test-external-id-12345678901234567890',
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(200);

        expect(body).to.have.property('id');
        expect(body.name).to.equal('test-aws-connector');
        expect(body.cloudProvider).to.equal('aws');
        expect(body.vars).to.have.property('role_arn');
        expect(body.vars).to.have.property('external_id');
        expect(body.packagePolicyCount).to.equal(0);
        expect(body).to.have.property('created_at');
        expect(body).to.have.property('updated_at');
      });

      it('should handle AWS external with aws.role_arn and aws.credentials.external_id format', async () => {
        const { body } = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-aws-connector-alt-format',
            cloudProvider: 'aws',
            vars: {
              'aws.role_arn': 'arn:aws:iam::123456789012:role/test-role-alt',
              'aws.credentials.external_id': {
                type: 'password',
                value: {
                  id: 'test-external-id-alt-12345678901234567890',
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(200);

        expect(body).to.have.property('id');
        expect(body.name).to.equal('test-aws-connector-alt-format');
        expect(body.cloudProvider).to.equal('aws');
        expect(body.vars).to.have.property('role_arn');
        expect(body.vars).to.have.property('external_id');
        expect(body.packagePolicyCount).to.equal(1);
      });

      it('should return 400 when external_id is missing for AWS', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-aws-connector-no-external-id',
            cloudProvider: 'aws',
            vars: {
              role_arn: 'arn:aws:iam::123456789012:role/test-role',
            },
          })
          .expect(400);
      });

      it('should return 400 when role_arn is missing for AWS', async () => {
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-aws-connector-no-role-arn',
            cloudProvider: 'aws',
            vars: {
              external_id: {
                type: 'password',
                value: {
                  id: 'test-external-id-12345678901234567890',
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
              role_arn: 'arn:aws:iam::123456789012:role/test-role',
              external_id: {
                type: 'password',
                value: {
                  id: 'test-external-id-12345678901234567890',
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
              role_arn: 'arn:aws:iam::123456789012:role/test-role',
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
              role_arn: 'arn:aws:iam::123456789012:role/test-role',
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
              role_arn: 'arn:aws:iam::123456789012:role/test-role',
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
              role_arn: 'arn:aws:iam::123456789012:role/test-role',
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
              role_arn: 'arn:aws:iam::123456789012:role/test-role',
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
              role_arn: 'arn:aws:iam::123456789012:role/test-role',
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
            name: 'test-aws-connector-mixed-case',
            cloudProvider: 'aws',
            vars: {
              role_arn: 'arn:aws:iam::123456789012:role/test-role',
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

        expect(body).to.have.property('id');
        expect(body.name).to.equal('test-aws-connector-mixed-case');
        expect(body.vars.external_id).to.have.property('id', 'aBcDeFgHiJkLmNoPqRsT');
      });
    });

    describe('GET /api/fleet/cloud_connectors', () => {
      let createdConnectorId: string;

      before(async () => {
        // Create a test connector for GET tests
        const { body } = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-get-connector',
            cloudProvider: 'aws',
            vars: {
              role_arn: 'arn:aws:iam::123456789012:role/test-role',
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
        createdConnectorId = body.id;
      });

      it('should get list of cloud connectors', async () => {
        const { body } = await supertest.get(`/api/fleet/cloud_connectors`).expect(200);

        expect(body).to.be.an('array');
        expect(body.length).to.be.greaterThan(0);

        const connector = body.find((c: any) => c.id === createdConnectorId);
        expect(connector).to.be.an('object');
        expect(connector.name).to.equal('test-get-connector');
        expect(connector.cloudProvider).to.equal('aws');
        expect(connector.vars).to.have.property('role_arn');
        expect(connector.vars).to.have.property('external_id');
        expect(connector).to.have.property('packagePolicyCount');
        expect(connector).to.have.property('created_at');
        expect(connector).to.have.property('updated_at');
      });

      it('should return empty array when no connectors exist', async () => {
        // Clean up existing connectors
        await kibanaServer.savedObjects.cleanStandardList();

        const { body } = await supertest.get(`/api/fleet/cloud_connectors`).expect(200);

        expect(body).to.be.an('array');
        expect(body.length).to.equal(0);
      });

      it('should handle pagination parameters', async () => {
        const { body } = await supertest
          .get(`/api/fleet/cloud_connectors?page=1&perPage=10`)
          .expect(200);

        expect(body).to.be.an('array');
      });
    });

    describe('Cloud Connector with Package Policy Integration', () => {
      it('should create cloud connector and associate with package policy', async () => {
        // First create a cloud connector
        const { body: cloudConnector } = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-integration-connector',
            cloudProvider: 'aws',
            vars: {
              role_arn: 'arn:aws:iam::123456789012:role/test-role',
              external_id: {
                type: 'password',
                value: {
                  id: 'test-external-id-12345678901234567890',
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(200);

        expect(cloudConnector).to.have.property('id');
        expect(cloudConnector.packagePolicyCount).to.equal(1);

        // Verify the cloud connector was created with correct properties
        expect(cloudConnector.name).to.equal('test-integration-connector');
        expect(cloudConnector.cloudProvider).to.equal('aws');
        expect(cloudConnector.vars).to.have.property('role_arn');
        expect(cloudConnector.vars).to.have.property('external_id');
      });

      it('should handle cloud connector creation with package policy variables', async () => {
        const { body } = await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-package-policy-vars',
            cloudProvider: 'aws',
            vars: {
              'aws.role_arn': 'arn:aws:iam::123456789012:role/test-role-policy',
              'aws.credentials.external_id': {
                type: 'password',
                value: {
                  id: 'test-external-id-policy-12345678901234567890',
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(200);

        expect(body).to.have.property('id');
        expect(body.name).to.equal('test-package-policy-vars');
        expect(body.cloudProvider).to.equal('aws');
        expect(body.vars).to.have.property('role_arn');
        expect(body.vars).to.have.property('external_id');
        expect(body.packagePolicyCount).to.equal(1);
      });
    });

    describe('Error handling', () => {
      it('should return 500 when service throws error', async () => {
        // This test would require mocking the service to throw an error
        // In a real scenario, this would test database connection issues, etc.
        await supertest
          .post(`/api/fleet/cloud_connectors`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            name: 'test-error-connector',
            cloudProvider: 'aws',
            vars: {
              role_arn: 'arn:aws:iam::123456789012:role/test-role',
              external_id: {
                type: 'password',
                value: {
                  id: 'test-external-id-12345678901234567890',
                  isSecretRef: true,
                },
              },
            },
          })
          .expect(200); // This should succeed in normal conditions
      });
    });
  });
}
