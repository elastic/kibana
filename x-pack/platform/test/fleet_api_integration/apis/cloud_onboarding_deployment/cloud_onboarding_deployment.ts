/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { skipIfNoDockerRegistry } from '../../helpers';
import { testUsers } from '../test_users';
import { createAgentDoc } from '../agent_policy/cleanup_agent_policy_revisions';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

const BASE_URL = '/api/fleet/cloud_onboarding_deployments';
const SO_API = '/api/saved_objects';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
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
            mechanisms: ['managed_integration'],
            services: ['cloudwatch_metrics'],
            serviceVars: {
              cloudwatch_metrics: { regions: ['us-east-1'], namespace: 'AWS/EC2' },
            },
          })
          .expect(200);

        expect(body.item).to.have.property('id');
        expect(body.item.provider).to.equal('aws');
        expect(body.item.connectorId).to.equal(primaryConnectorId);
        expect(body.item.mechanisms).to.eql(['managed_integration']);
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

      it('should create a static-keys deployment when connectorId is omitted', async () => {
        // connectorId is now optional — static-keys flow omits it and passes authMethod instead.
        const { body } = await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            authMethod: 'static_keys',
            mechanisms: ['managed_integration'],
            services: ['cloudtrail'],
            globalRegion: 'us-east-1',
            dataFormat: 'ecs',
          })
          .expect(200);

        expect(body.item).to.have.property('id');
        expect(body.item.provider).to.equal('aws');
        expect(body.item.authMethod).to.equal('static_keys');
        expect(body.item.globalRegion).to.equal('us-east-1');
        expect(body.item.dataFormat).to.equal('ecs');
        expect(body.item.connectorId).to.be(undefined);
        expect(body.item.status).to.equal('pending');

        createdIds.push(body.item.id);
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

      it('should store and return the integration name and description', async () => {
        const { body } = await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            authMethod: 'static_keys',
            mechanisms: ['managed_integration'],
            services: ['cloudtrail'],
            integrationName: 'my-aws',
            description: 'Production AWS',
          })
          .expect(200);

        expect(body.item.integrationName).to.equal('my-aws');
        expect(body.item.description).to.equal('Production AWS');
        createdIds.push(body.item.id);

        const { body: fetched } = await supertest
          .get(`${BASE_URL}/${body.item.id}`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        expect(fetched.item.integrationName).to.equal('my-aws');
        expect(fetched.item.description).to.equal('Production AWS');
      });

      it('should accept an integration name of exactly the limit (160)', async () => {
        const { body } = await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            authMethod: 'static_keys',
            mechanisms: ['managed_integration'],
            services: ['cloudtrail'],
            integrationName: 'a'.repeat(160),
          })
          .expect(200);

        createdIds.push(body.item.id);
      });

      it('should reject an integration name over the limit shared with the UI (160)', async () => {
        await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            authMethod: 'static_keys',
            mechanisms: ['managed_integration'],
            services: ['cloudtrail'],
            integrationName: 'a'.repeat(161),
          })
          .expect(400);
      });

      it('should create an agent-based deployment with authMethod and no connectorId', async () => {
        const { body } = await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            mechanisms: ['agent_based'],
            services: ['ec2_otel'],
            globalRegion: 'eu-west-1',
            dataFormat: 'otel',
            authMethod: 'assume_role',
          })
          .expect(200);

        expect(body.item).to.have.property('id');
        expect(body.item.provider).to.equal('aws');
        expect(body.item.mechanisms).to.eql(['agent_based']);
        expect(body.item.authMethod).to.equal('assume_role');
        expect(body.item.globalRegion).to.equal('eu-west-1');
        expect(body.item.dataFormat).to.equal('otel');
        expect(body.item.connectorId).to.be(undefined);
        expect(body.item.status).to.equal('pending');

        createdIds.push(body.item.id);
      });

      it('should return 400 for an invalid authMethod', async () => {
        await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            mechanisms: ['agent_based'],
            services: ['ec2_otel'],
            authMethod: 'invalid_method',
          })
          .expect(400);
      });

      it('should return 400 when agent_based deployment uses identity_federation authMethod', async () => {
        await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            mechanisms: ['agent_based'],
            services: ['ec2_otel'],
            authMethod: 'identity_federation',
          })
          .expect(400);
      });

      it('should return 400 when managed_integration deployment uses assume_role authMethod', async () => {
        await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            connectorId: primaryConnectorId,
            mechanisms: ['managed_integration'],
            services: ['cloudtrail'],
            authMethod: 'assume_role',
          })
          .expect(400);
      });

      it('should return 400 when mixed agent_based+managed_integration deployment uses assume_role authMethod', async () => {
        await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            connectorId: primaryConnectorId,
            mechanisms: ['agent_based', 'managed_integration'],
            services: ['ec2_otel', 'cloudtrail'],
            authMethod: 'assume_role',
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
            mechanisms: ['managed_integration'],
            services: ['cloudwatch_metrics'],
            serviceVars: {
              cloudwatch_metrics: { regions: ['us-east-1'], namespace: 'AWS/EC2' },
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
        for (const mechanism of ['managed_integration', 'ecf'] as const) {
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

    describe('GET /api/fleet/cloud_onboarding_deployments', () => {
      const createdIds: string[] = [];
      const packageA = 'list-test-package-a';
      const packageB = 'list-test-package-b';

      const create = async (body: Record<string, unknown>) => {
        const { body: created } = await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({ mechanisms: ['ecf'], services: ['cloudtrail'], ...body })
          .expect(200);
        createdIds.push(created.item.id);
        return created.item.id as string;
      };

      before(async () => {
        await create({ provider: 'aws', packageNames: [packageA], integrationName: 'only-a' });
        await create({
          provider: 'aws',
          packageNames: [packageA, packageB],
          integrationName: 'a-and-b',
        });
        await create({ provider: 'azure', packageNames: [packageA], integrationName: 'azure-a' });
        // Saved before packageNames existed: has no packageNames.
        await create({ provider: 'aws', integrationName: 'no-packages' });
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

      it('should filter by packageName, listing a session under every package it covers', async () => {
        const { body: a } = await supertest
          .get(BASE_URL)
          .query({ packageName: packageA })
          .expect(200);
        const { body: b } = await supertest
          .get(BASE_URL)
          .query({ packageName: packageB })
          .expect(200);

        expect(a.items.map((i: any) => i.integrationName).sort()).to.eql([
          'a-and-b',
          'azure-a',
          'only-a',
        ]);
        expect(a.total).to.equal(3);
        expect(b.items.map((i: any) => i.integrationName)).to.eql(['a-and-b']);
      });

      it('should filter by provider', async () => {
        const { body } = await supertest
          .get(BASE_URL)
          .query({ packageName: packageA, provider: 'aws' })
          .expect(200);

        expect(body.items.map((i: any) => i.integrationName).sort()).to.eql(['a-and-b', 'only-a']);
      });

      it('should return the packages, services by method, agents, user and update time', async () => {
        const { body } = await supertest.get(BASE_URL).query({ packageName: packageB }).expect(200);

        const [item] = body.items;
        expect(item.packageNames).to.eql([packageA, packageB]);
        expect(item.packages).to.eql([]);
        expect(item.servicesByMethod).to.eql({ ecf: ['cloudtrail'] });
        expect(item.agentCount).to.equal(0);
        expect(item.updatedAt).to.be.a('string');
        expect(item.updatedBy).to.be.a('string');
      });

      it('should paginate, newest first', async () => {
        const { body: first } = await supertest
          .get(BASE_URL)
          .query({ packageName: packageA, perPage: 2, page: 1 })
          .expect(200);
        const { body: second } = await supertest
          .get(BASE_URL)
          .query({ packageName: packageA, perPage: 2, page: 2 })
          .expect(200);

        expect(first.items).to.have.length(2);
        expect(second.items).to.have.length(1);
        expect(first.total).to.equal(3);
        expect(second.page).to.equal(2);
        expect(first.perPage).to.equal(2);
        expect(first.items[0].updatedAt >= first.items[1].updatedAt).to.be(true);
      });

      it('should return an empty result for an unknown package', async () => {
        const { body } = await supertest
          .get(BASE_URL)
          .query({ packageName: 'no-such-package' })
          .expect(200);

        expect(body).to.eql({ items: [], total: 0, page: 1, perPage: 20 });
      });

      it('should list a session saved without packageNames when not filtering by package', async () => {
        const { body } = await supertest.get(BASE_URL).query({ perPage: 100 }).expect(200);

        const item = body.items.find((i: any) => i.integrationName === 'no-packages');
        expect(item).to.be.ok();
        expect(item.packageNames).to.be(undefined);
      });

      it('should return 400 for an invalid perPage', async () => {
        await supertest.get(BASE_URL).query({ perPage: 1000 }).expect(400);
      });
    });

    describe('GET /api/fleet/cloud_onboarding_deployments agent counts', () => {
      const PACKAGE_NAME = 'agent-count-test-package';
      // Stored agent policy ids are client-supplied: one the request's saved objects client cannot
      // resolve (e.g. a policy of another space) must not have its agents counted.
      const UNRESOLVABLE_POLICY_ID = 'agent-count-test-unresolvable-policy';
      const agentIds = ['agent-count-test-agent-1', 'agent-count-test-agent-2'];
      let agentPolicyId: string;
      let deploymentId: string;

      before(async () => {
        const { body: policyBody } = await supertest
          .post('/api/fleet/agent_policies')
          .set('kbn-xsrf', 'xxxx')
          .send({ name: `agent-count-test-policy-${Date.now()}`, namespace: 'default' })
          .expect(200);
        agentPolicyId = policyBody.item.id;

        await createAgentDoc(providerContext, agentIds[0], agentPolicyId);
        await createAgentDoc(providerContext, agentIds[1], UNRESOLVABLE_POLICY_ID);

        const { body } = await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            mechanisms: ['agent_based'],
            services: ['cloudtrail'],
            packageNames: [PACKAGE_NAME],
            agentPolicyIds: [agentPolicyId, UNRESOLVABLE_POLICY_ID],
          })
          .expect(200);
        deploymentId = body.item.id;
      });

      after(async () => {
        for (const id of agentIds) {
          await es.delete({ index: '.fleet-agents', id, refresh: 'wait_for' }).catch(() => {});
        }
        await supertest
          .delete(`${BASE_URL}/${deploymentId}`)
          .set('kbn-xsrf', 'xxxx')
          .catch(() => {});
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyId })
          .catch(() => {});
      });

      it('counts only the agents of agent policies the request can resolve', async () => {
        const { body } = await supertest
          .get(BASE_URL)
          .query({ packageName: PACKAGE_NAME })
          .expect(200);

        expect(body.items).to.have.length(1);
        expect(body.items[0].id).to.equal(deploymentId);
        expect(body.items[0].agentCount).to.equal(1);
        expect(body.items[0].servicesByMethod).to.eql({ agent_based: ['cloudtrail'] });
      });
    });

    describe('authorization', () => {
      let deploymentId: string;

      before(async () => {
        const { body } = await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({ provider: 'aws', mechanisms: ['ecf'], services: ['cloudtrail'] })
          .expect(200);
        deploymentId = body.item.id;
      });

      after(async () => {
        await supertest
          .delete(`${BASE_URL}/${deploymentId}`)
          .set('kbn-xsrf', 'xxxx')
          .catch(() => {});
      });

      const asUser = (user: { username: string; password: string }) => ({
        get: (url: string) => supertestWithoutAuth.get(url).auth(user.username, user.password),
        post: (url: string) =>
          supertestWithoutAuth.post(url).auth(user.username, user.password).set('kbn-xsrf', 'xxxx'),
        put: (url: string) =>
          supertestWithoutAuth.put(url).auth(user.username, user.password).set('kbn-xsrf', 'xxxx'),
        delete: (url: string) =>
          supertestWithoutAuth
            .delete(url)
            .auth(user.username, user.password)
            .set('kbn-xsrf', 'xxxx'),
      });

      it('lets a read-only Fleet user list and get deployments', async () => {
        const readOnly = asUser(testUsers.fleet_read_only);
        await readOnly.get(BASE_URL).expect(200);
        await readOnly.get(`${BASE_URL}/${deploymentId}`).expect(200);
      });

      it('forbids a read-only Fleet user to create, update or delete deployments', async () => {
        const readOnly = asUser(testUsers.fleet_read_only);
        await readOnly
          .post(BASE_URL)
          .send({ provider: 'aws', mechanisms: ['ecf'], services: ['cloudtrail'] })
          .expect(403);
        await readOnly.put(`${BASE_URL}/${deploymentId}`).send({ status: 'failed' }).expect(403);
        await readOnly.delete(`${BASE_URL}/${deploymentId}`).expect(403);
      });

      it('forbids a user without Fleet access to list deployments', async () => {
        await asUser(testUsers.fleet_no_access).get(BASE_URL).expect(403);
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
            mechanisms: ['managed_integration'],
            services: ['cloudwatch_metrics'],
            serviceVars: {
              cloudwatch_metrics: { regions: ['us-east-1'], namespace: 'AWS/EC2' },
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
          cloudwatch_metrics: { regions: ['us-east-1', 'eu-west-1'], namespace: 'AWS/EC2' },
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

      it('should return 400 when updating a managed_integration deployment with assume_role authMethod', async () => {
        await supertest
          .put(`${BASE_URL}/${deploymentId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ authMethod: 'assume_role' })
          .expect(400);
      });
    });

    describe('agent_based deployment — PUT round-trip', () => {
      let deploymentId: string;

      const createAgentBasedDeployment = async (authMethod: string) => {
        const { body } = await supertest
          .post(BASE_URL)
          .set('kbn-xsrf', 'xxxx')
          .send({
            provider: 'aws',
            mechanisms: ['agent_based'],
            services: ['ec2_otel'],
            globalRegion: 'eu-west-1',
            dataFormat: 'otel',
            authMethod,
          })
          .expect(200);
        return body.item.id as string;
      };

      beforeEach(async () => {
        deploymentId = await createAgentBasedDeployment('assume_role');
      });

      afterEach(async () => {
        try {
          await supertest.delete(`${BASE_URL}/${deploymentId}`).set('kbn-xsrf', 'xxxx');
        } catch (_) {
          // ignore
        }
      });

      it('should update agentPolicyIds (array), packagePolicyIds and status:succeeded', async () => {
        const agentPolicyIds = ['policy-id-1', 'policy-id-2', 'policy-id-3'];
        const packagePolicyIds = ['pkg-policy-id-1'];

        const { body } = await supertest
          .put(`${BASE_URL}/${deploymentId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyIds, packagePolicyIds, status: 'succeeded' })
          .expect(200);

        expect(body.item.agentPolicyIds).to.eql(agentPolicyIds);
        expect(body.item.packagePolicyIds).to.eql(packagePolicyIds);
        expect(body.item.status).to.equal('succeeded');
        // authMethod set on create must be preserved through update
        expect(body.item.authMethod).to.equal('assume_role');
        expect(body.item.connectorId).to.be(undefined);
      });

      it('should set status:failed without agentPolicyIds (partial failure before policy creation)', async () => {
        const { body } = await supertest
          .put(`${BASE_URL}/${deploymentId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ status: 'failed' })
          .expect(200);

        expect(body.item.status).to.equal('failed');
        expect(body.item.agentPolicyIds).to.be(undefined);
      });

      it('should return 400 when agentPolicyIds is passed as a bare string', async () => {
        await supertest
          .put(`${BASE_URL}/${deploymentId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ agentPolicyIds: 'not-an-array', status: 'succeeded' })
          .expect(400);
      });

      it('should return 400 when updating an agent_based deployment with identity_federation authMethod', async () => {
        await supertest
          .put(`${BASE_URL}/${deploymentId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ authMethod: 'identity_federation' })
          .expect(400);
      });

      it('should update authMethod on an agent_based deployment with a valid agent-based method', async () => {
        const { body } = await supertest
          .put(`${BASE_URL}/${deploymentId}`)
          .set('kbn-xsrf', 'xxxx')
          .send({ authMethod: 'shared_credentials' })
          .expect(200);
        expect(body.item.authMethod).to.equal('shared_credentials');
      });

      for (const authMethod of [
        'static_keys',
        'temporary_keys',
        'shared_credentials',
        'assume_role',
      ] as const) {
        it(`should create and retrieve an agent_based deployment with authMethod: ${authMethod}`, async () => {
          const id = await createAgentBasedDeployment(authMethod);
          const { body } = await supertest.get(`${BASE_URL}/${id}`).expect(200);
          expect(body.item.authMethod).to.equal(authMethod);
          expect(body.item.mechanisms).to.eql(['agent_based']);
          await supertest.delete(`${BASE_URL}/${id}`).set('kbn-xsrf', 'xxxx');
        });
      }
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
            mechanisms: ['managed_integration'],
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
            mechanisms: ['managed_integration'],
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

      it('GET list returns only the deployments of the space', async () => {
        const { body: spaceList } = await supertest
          .get(spaceUrl(BASE_URL))
          .query({ perPage: 100 })
          .expect(200);
        const spaceIds = spaceList.items.map((item: { id: string }) => item.id);
        expect(spaceIds).to.contain(testSpaceDeploymentId);
        expect(spaceIds).not.to.contain(defaultSpaceDeploymentId);

        const { body: defaultList } = await supertest
          .get(BASE_URL)
          .query({ perPage: 100 })
          .expect(200);
        const defaultIds = defaultList.items.map((item: { id: string }) => item.id);
        expect(defaultIds).to.contain(defaultSpaceDeploymentId);
        expect(defaultIds).not.to.contain(testSpaceDeploymentId);
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
            mechanisms: ['managed_integration'],
            services: ['cloudwatch_metrics'],
            serviceVars: {
              cloudwatch_metrics: { regions: ['us-east-1'], namespace: 'AWS/EC2' },
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
