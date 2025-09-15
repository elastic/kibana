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

        expect(body).to.have.property('id');
        expect(body.name).to.equal('arn:aws:iam::123456789012:role/test-role');
        expect(body.cloudProvider).to.equal('aws');
        expect(body.vars).to.have.property('role_arn');
        expect(body.vars).to.have.property('external_id');
        expect(body.packagePolicyCount).to.equal(1);
        expect(body).to.have.property('created_at');
        expect(body).to.have.property('updated_at');
        expect(body).to.have.property('namespace');
        expect(body.namespace).to.equal('*');
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

        expect(body).to.have.property('id');
        expect(body.name).to.equal('arn:aws:iam::123456789012:role/test-role');
        expect(body.vars.external_id.value).to.have.property('id', 'aBcDeFgHiJkLmNoPqRsT');
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
        createdConnectorId = body.id;
      });

      it('should get list of cloud connectors', async () => {
        const { body } = await supertest.get(`/api/fleet/cloud_connectors`).expect(200);

        expect(body).to.be.an('array');
        expect(body.length).to.be.greaterThan(0);

        const connector = body.find((c: any) => c.id === createdConnectorId);
        expect(connector).to.be.an('object');
        expect(connector.name).to.equal('arn:aws:iam::123456789012:role/test-role');
        expect(connector.cloudProvider).to.equal('aws');
        expect(connector.vars).to.have.property('role_arn');
        expect(connector.vars).to.have.property('external_id');
        expect(connector).to.have.property('packagePolicyCount');
        expect(connector).to.have.property('created_at');
        expect(connector).to.have.property('updated_at');
      });

      it('should return empty array when no connectors exist', async () => {
        // Clean up all saved objects to ensure no connectors exist
        await esArchiver.emptyKibanaIndex();

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
  });
}
