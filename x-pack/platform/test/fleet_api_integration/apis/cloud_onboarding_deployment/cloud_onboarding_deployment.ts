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
const SO_API = '/api/saved_objects';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const fleetAndAgents = getService('fleetAndAgents');

  describe('fleet_cloud_onboarding_deployments', () => {
    skipIfNoDockerRegistry(providerContext);

    // Connector IDs created once and shared across suites that need them.
    let primaryConnectorId: string;
    let secondaryConnectorId: string;
    let listConnectorId: string;

    let connectorSeq = 0;
    // Create a fleet-cloud-connector SO directly (bypasses Fleet API validation).
    // The connectorId validation in the deployment service only checks that the SO exists.
    const createConnector = async (urlPrefix = '') => {
      const name = `test-connector-${++connectorSeq}`;
      const { body } = await supertest
        .post(`${urlPrefix}${SO_API}/fleet-cloud-connector`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          attributes: {
            name,
            cloudProvider: 'aws',
            vars: {},
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        })
        .expect(200);
      return body.id as string;
    };

    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await kibanaServer.savedObjects.cleanStandardList();
      await fleetAndAgents.setup();

      primaryConnectorId = await createConnector();
      secondaryConnectorId = await createConnector();
      listConnectorId = await createConnector();
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
          .send({
            provider: 'aws',
            connectorId: primaryConnectorId,
            mechanisms: ['agentless'],
            services: ['cloudwatch_metrics'],
            serviceVars: {
              cloudwatch_metrics: [{ regions: ['us-east-1'], namespace: 'AWS/EC2' }],
            },
          })
          .expect(200);

        expect(body.item).to.have.property('id');
        expect(body.item.provider).to.equal('aws');
        expect(body.item.connectorId).to.equal(primaryConnectorId);
        expect(body.item.mechanisms).to.eql(['agentless']);
        expect(body.item.services).to.eql(['cloudwatch_metrics']);
        expect(body.item.status).to.equal('pending');
        expect(body.item.attemptCount).to.equal(1);
        expect(body.item.serviceVars).to.have.property('cloudwatch_metrics');

        createdIds.push(body.item.id);
      });

      it('should create a minimal deployment (no serviceVars)', async () => {
        const { body } = await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            connectorId: secondaryConnectorId,
            mechanisms: [],
            services: ['s3_logs'],
          })
          .expect(200);

        expect(body.item).to.have.property('id');
        expect(body.item.status).to.equal('pending');
        expect(body.item.attemptCount).to.equal(1);

        createdIds.push(body.item.id);
      });

      it('should return 400 when connectorId does not exist', async () => {
        await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            connectorId: '00000000-0000-0000-0000-000000000000',
            mechanisms: [],
            services: ['cloudtrail'],
          })
          .expect(400);
      });

      it('should return 400 when provider is missing', async () => {
        await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({ connectorId: primaryConnectorId, mechanisms: [], services: ['cloudtrail'] })
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
          .send({ provider: 'aws', connectorId: primaryConnectorId, mechanisms: [] })
          .expect(400);
      });

      it('should return 400 when services is empty', async () => {
        await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({ provider: 'aws', connectorId: primaryConnectorId, mechanisms: [], services: [] })
          .expect(400);
      });

      it('should return 400 when provider is invalid', async () => {
        await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'invalid-cloud',
            connectorId: primaryConnectorId,
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
            connectorId: primaryConnectorId,
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
          .send({
            provider: 'aws',
            connectorId: primaryConnectorId,
            mechanisms: ['agentless'],
            services: ['cloudwatch_metrics'],
            serviceVars: {
              cloudwatch_metrics: [{ regions: ['us-east-1'], namespace: 'AWS/EC2' }],
            },
          })
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
        expect(body.item.connectorId).to.equal(primaryConnectorId);
        expect(body.item.status).to.equal('pending');
      });

      it('should return 404 for a non-existent deployment ID', async () => {
        await supertest.get(`${BASE_URL}/00000000-0000-0000-0000-000000000000`).expect(404);
      });
    });

    describe('GET /api/fleet/cloud_onboarding_deployments/connector/{connectorId}', () => {
      const createdIds: string[] = [];

      before(async () => {
        // Create two deployments for the same connector
        for (const mechanism of ['agentless', 'firehose'] as const) {
          const { body } = await supertest
            .post(BASE_URL)
            .set('kbn-xsrf', 'xxxx')
            .send({
              provider: 'aws',
              connectorId: listConnectorId,
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
        const { body } = await supertest
          .get(`${BASE_URL}/connector/${listConnectorId}`)
          .expect(200);

        expect(body.items).to.be.an('array');
        expect(body.items.length).to.equal(2);
        body.items.forEach((item: Record<string, unknown>) => {
          expect(item.connectorId).to.equal(listConnectorId);
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
          .send({
            provider: 'aws',
            connectorId: primaryConnectorId,
            mechanisms: ['agentless'],
            services: ['cloudwatch_metrics'],
            serviceVars: {
              cloudwatch_metrics: [{ regions: ['us-east-1'], namespace: 'AWS/EC2' }],
            },
          })
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

    describe('Space isolation', () => {
      const TEST_SPACE = 'test-cloud-onboarding-space';
      const spaceUrl = (path: string) => `/s/${TEST_SPACE}${path}`;
      let defaultSpaceConnectorId: string;
      let testSpaceConnectorId: string;
      let defaultSpaceDeploymentId: string;
      let testSpaceDeploymentId: string;

      before(async () => {
        await kibanaServer.spaces.create({ id: TEST_SPACE, name: TEST_SPACE }).catch(() => {});

        defaultSpaceConnectorId = await createConnector();
        testSpaceConnectorId = await createConnector(`/s/${TEST_SPACE}`);

        const { body: defaultBody } = await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            connectorId: defaultSpaceConnectorId,
            mechanisms: ['agentless'],
            services: ['cloudtrail'],
          })
          .expect(200);
        defaultSpaceDeploymentId = defaultBody.item.id;

        const { body: spaceBody } = await supertest
          .post(spaceUrl(BASE_URL))
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            connectorId: testSpaceConnectorId,
            mechanisms: ['agentless'],
            services: ['cloudtrail'],
          })
          .expect(200);
        testSpaceDeploymentId = spaceBody.item.id;
      });

      after(async () => {
        try {
          await supertest
            .delete(`${BASE_URL}/${defaultSpaceDeploymentId}`)
            .set('kbn-xsrf', 'xxxx')
            .catch(() => {});
          await supertest
            .delete(spaceUrl(`${BASE_URL}/${testSpaceDeploymentId}`))
            .set('kbn-xsrf', 'xxxx')
            .catch(() => {});
        } finally {
          await kibanaServer.spaces.delete(TEST_SPACE).catch(() => {});
        }
      });

      it('GET by ID returns a deployment from the same space', async () => {
        const { body } = await supertest
          .get(spaceUrl(`${BASE_URL}/${testSpaceDeploymentId}`))
          .expect(200);
        expect(body.item.id).to.equal(testSpaceDeploymentId);
        expect(body.item.connectorId).to.equal(testSpaceConnectorId);
      });

      it('GET by ID returns 404 for a deployment created in a different space', async () => {
        // default-space deployment is invisible from the test space
        await supertest.get(spaceUrl(`${BASE_URL}/${defaultSpaceDeploymentId}`)).expect(404);
        // test-space deployment is invisible from the default space
        await supertest.get(`${BASE_URL}/${testSpaceDeploymentId}`).expect(404);
      });

      it('GET by connector ID only returns deployments from the same space', async () => {
        const { body: testSpaceBody } = await supertest
          .get(spaceUrl(`${BASE_URL}/connector/${testSpaceConnectorId}`))
          .expect(200);
        expect(testSpaceBody.items).to.have.length(1);
        expect(testSpaceBody.items[0].id).to.equal(testSpaceDeploymentId);

        const { body: defaultSpaceBody } = await supertest
          .get(`${BASE_URL}/connector/${defaultSpaceConnectorId}`)
          .expect(200);
        expect(defaultSpaceBody.items).to.have.length(1);
        expect(defaultSpaceBody.items[0].id).to.equal(defaultSpaceDeploymentId);

        // Cross-space connector queries return nothing
        const { body: crossDefault } = await supertest
          .get(`${BASE_URL}/connector/${testSpaceConnectorId}`)
          .expect(200);
        expect(crossDefault.items).to.eql([]);

        const { body: crossTest } = await supertest
          .get(spaceUrl(`${BASE_URL}/connector/${defaultSpaceConnectorId}`))
          .expect(200);
        expect(crossTest.items).to.eql([]);
      });
    });

    describe('DELETE /api/fleet/cloud_onboarding_deployments/{id}', () => {
      it('should delete a deployment and return its ID', async () => {
        const { body: created } = await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            connectorId: primaryConnectorId,
            mechanisms: ['agentless'],
            services: ['cloudwatch_metrics'],
            serviceVars: {
              cloudwatch_metrics: [{ regions: ['us-east-1'], namespace: 'AWS/EC2' }],
            },
          })
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
