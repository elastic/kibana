/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { skipIfNoDockerRegistry } from '../../helpers';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

const BASE_URL = '/api/fleet/cloud_onboarding_deployments';

const VALID_CREATE_BODY = {
  provider: 'aws',
  connectorId: 'test-connector-id-1',
  mechanisms: ['identity_federation'],
  services: ['cloudwatch_metrics'],
  vars: { role_arn: 'arn:aws:iam::123456789012:role/ElasticIntegrationRole' },
  serviceVars: {
    cloudwatch_metrics: [{ regions: ['us-east-1'], namespace: 'AWS/EC2' }],
  },
  secrets: { external_id: 'ext-abc123' },
};

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('fleet_cloud_onboarding_deployments', () => {
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

    describe('POST /api/fleet/cloud_onboarding_deployments', () => {
      const createdIds: string[] = [];

      after(async () => {
        for (const id of createdIds) {
          try {
            await supertest.delete(`${BASE_URL}/${id}`).set('kbn-xsrf', 'xxxx');
          } catch (_) {
            // ignore
          }
        }
      });

      it('should create a deployment and return the expected shape', async () => {
        const { body } = await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send(VALID_CREATE_BODY)
          .expect(200);

        expect(body.item).to.have.property('id');
        expect(body.item.provider).to.equal('aws');
        expect(body.item.connectorId).to.equal('test-connector-id-1');
        expect(body.item.mechanisms).to.eql(['identity_federation']);
        expect(body.item.services).to.eql(['cloudwatch_metrics']);
        expect(body.item.status).to.equal('pending');
        expect(body.item.attemptCount).to.equal(1);
        expect(body.item.vars).to.have.property('role_arn');
        expect(body.item.serviceVars).to.have.property('cloudwatch_metrics');
        expect(body.item).to.have.property('createdAt');
        expect(body.item).to.have.property('updatedAt');
        // secrets must be stripped from the response
        expect(body.item).not.to.have.property('secrets');

        createdIds.push(body.item.id);
      });

      it('should create a minimal deployment (no vars, serviceVars, or secrets)', async () => {
        const { body } = await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            connectorId: 'test-connector-id-2',
            mechanisms: [],
            services: ['s3_logs'],
          })
          .expect(200);

        expect(body.item).to.have.property('id');
        expect(body.item.status).to.equal('pending');
        expect(body.item.attemptCount).to.equal(1);

        createdIds.push(body.item.id);
      });

      it('should return 400 when provider is missing', async () => {
        await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({ connectorId: 'conn-1', mechanisms: [], services: ['cloudtrail'] })
          .expect(400);
      });

      it('should return 400 when connectorId is missing', async () => {
        await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({ provider: 'aws', mechanisms: [], services: ['cloudtrail'] })
          .expect(400);
      });

      it('should return 400 when connectorId is empty string', async () => {
        await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({ provider: 'aws', connectorId: '', mechanisms: [], services: ['cloudtrail'] })
          .expect(400);
      });

      it('should return 400 when services is missing', async () => {
        await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({ provider: 'aws', connectorId: 'conn-1', mechanisms: [] })
          .expect(400);
      });

      it('should return 400 when services is empty', async () => {
        await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({ provider: 'aws', connectorId: 'conn-1', mechanisms: [], services: [] })
          .expect(400);
      });

      it('should return 400 when provider is invalid', async () => {
        await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'invalid-cloud',
            connectorId: 'conn-1',
            mechanisms: [],
            services: ['cloudtrail'],
          })
          .expect(400);
      });

      it('should return 400 when mechanism is invalid', async () => {
        await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            connectorId: 'conn-1',
            mechanisms: ['invalid_mechanism'],
            services: ['cloudtrail'],
          })
          .expect(400);
      });
    });

    describe('GET /api/fleet/cloud_onboarding_deployments/{id}', () => {
      let deploymentId: string;

      before(async () => {
        const { body } = await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send(VALID_CREATE_BODY)
          .expect(200);
        deploymentId = body.item.id;
      });

      after(async () => {
        await supertest.delete(`${BASE_URL}/${deploymentId}`).set('kbn-xsrf', 'xxxx');
      });

      it('should return the deployment by ID', async () => {
        const { body } = await supertest.get(`${BASE_URL}/${deploymentId}`).expect(200);

        expect(body.item.id).to.equal(deploymentId);
        expect(body.item.provider).to.equal('aws');
        expect(body.item.connectorId).to.equal('test-connector-id-1');
        expect(body.item.status).to.equal('pending');
        expect(body.item).not.to.have.property('secrets');
      });

      it('should return 404 for a non-existent deployment ID', async () => {
        await supertest.get(`${BASE_URL}/00000000-0000-0000-0000-000000000000`).expect(404);
      });
    });

    describe('GET /api/fleet/cloud_onboarding_deployments/connector/{connectorId}', () => {
      const connectorId = 'test-connector-list-1';
      const createdIds: string[] = [];

      before(async () => {
        // Create two deployments for the same connector
        for (const mechanism of ['identity_federation', 'firehose'] as const) {
          const { body } = await supertest
            .post(BASE_URL)
            .set('kbn-xsrf', 'xxxx')
            .send({
              provider: 'aws',
              connectorId,
              mechanisms: [mechanism],
              services: ['cloudtrail'],
            })
            .expect(200);
          createdIds.push(body.item.id);
        }
      });

      after(async () => {
        for (const id of createdIds) {
          try {
            await supertest.delete(`${BASE_URL}/${id}`).set('kbn-xsrf', 'xxxx');
          } catch (_) {
            // ignore
          }
        }
      });

      it('should return all deployments for the connector', async () => {
        const { body } = await supertest.get(`${BASE_URL}/connector/${connectorId}`).expect(200);

        expect(body.items).to.be.an('array');
        expect(body.items.length).to.equal(2);
        body.items.forEach((item: Record<string, unknown>) => {
          expect(item.connectorId).to.equal(connectorId);
          expect(item).not.to.have.property('secrets');
        });
      });

      it('should return an empty array for an unknown connector', async () => {
        const { body } = await supertest
          .get(`${BASE_URL}/connector/unknown-connector-id`)
          .expect(200);

        expect(body.items).to.eql([]);
      });
    });

    describe('PUT /api/fleet/cloud_onboarding_deployments/{id}', () => {
      let deploymentId: string;

      beforeEach(async () => {
        const { body } = await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send(VALID_CREATE_BODY)
          .expect(200);
        deploymentId = body.item.id;
      });

      afterEach(async () => {
        try {
          await supertest.delete(`${BASE_URL}/${deploymentId}`).set('kbn-xsrf', 'xxxx');
        } catch (_) {
          // ignore
        }
      });

      it('should update status to deploying and set deploymentId', async () => {
        const stackArn =
          'arn:aws:cloudformation:us-east-1:123456789012:stack/elastic-onboarding/aaa-bbb';

        const { body } = await supertest
          .put(`${BASE_URL}/${deploymentId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({
            status: 'deploying',
            deploymentId: stackArn,
            deploymentName: 'elastic-onboarding',
          })
          .expect(200);

        expect(body.item.status).to.equal('deploying');
        expect(body.item.deploymentId).to.equal(stackArn);
        expect(body.item.deploymentName).to.equal('elastic-onboarding');
        expect(body.item).not.to.have.property('secrets');
      });

      it('should update status to succeeded', async () => {
        const { body } = await supertest
          .put(`${BASE_URL}/${deploymentId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ status: 'succeeded' })
          .expect(200);

        expect(body.item.status).to.equal('succeeded');
      });

      it('should update status to failed with a statusMessage', async () => {
        const { body } = await supertest
          .put(`${BASE_URL}/${deploymentId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ status: 'failed', statusMessage: 'ROLLBACK_COMPLETE' })
          .expect(200);

        expect(body.item.status).to.equal('failed');
        expect(body.item.statusMessage).to.equal('ROLLBACK_COMPLETE');
      });

      it('should increment attemptCount on retry', async () => {
        const { body } = await supertest
          .put(`${BASE_URL}/${deploymentId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ status: 'pending', attemptCount: 2 })
          .expect(200);

        expect(body.item.status).to.equal('pending');
        expect(body.item.attemptCount).to.equal(2);
      });

      it('should update serviceVars', async () => {
        const serviceVars = {
          cloudwatch_metrics: [{ regions: ['us-east-1', 'eu-west-1'], namespace: 'AWS/EC2' }],
        };

        const { body } = await supertest
          .put(`${BASE_URL}/${deploymentId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ serviceVars })
          .expect(200);

        expect(body.item.serviceVars).to.eql(serviceVars);
      });

      it('should return 404 when updating a non-existent deployment', async () => {
        await supertest
          .put(`${BASE_URL}/00000000-0000-0000-0000-000000000000`)
          .set('kbn-xsrf', 'xxxx')
          .send({ status: 'deploying' })
          .expect(404);
      });

      it('should return 400 when status is invalid', async () => {
        await supertest
          .put(`${BASE_URL}/${deploymentId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ status: 'invalid-status' })
          .expect(400);
      });
    });

    describe('DELETE /api/fleet/cloud_onboarding_deployments/{id}', () => {
      it('should delete a deployment and return its ID', async () => {
        const { body: created } = await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send(VALID_CREATE_BODY)
          .expect(200);
        const id = created.item.id;

        const { body } = await supertest
          .delete(`${BASE_URL}/${id}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        expect(body.id).to.equal(id);

        // Subsequent GET should return 404
        await supertest.get(`${BASE_URL}/${id}`).expect(404);
      });

      it('should return 404 when deleting a non-existent deployment', async () => {
        await supertest
          .delete(`${BASE_URL}/00000000-0000-0000-0000-000000000000`)
          .set('kbn-xsrf', 'xxxx')
          .expect(404);
      });
    });
  });
}
