/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';

import { AGENTS_INDEX, AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/common';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { checkBulkAgentAction } from './helpers';

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const esClient = getService('es');
  const fleetAndAgents = getService('fleetAndAgents');
  const kibanaServer = getService('kibanaServer');

  describe('fleet_unenroll_agent', () => {
    skipIfNoDockerRegistry(providerContext);
    let accessAPIKeyId: string;
    let outputAPIKeyId: string;
    before(async () => {
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await fleetAndAgents.setup();
    });
    beforeEach(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/agents');
      await getService('supertest').post(`/api/fleet/setup`).set('kbn-xsrf', 'xxx').send();
      const accessAPIKeyBody = await esClient.security.createApiKey({
        name: `test access api key: ${uuidv4()}`,
      });
      accessAPIKeyId = accessAPIKeyBody.id;
      const outputAPIKeyBody = await esClient.security.createApiKey({
        name: `test output api key: ${uuidv4()}`,
      });
      outputAPIKeyId = outputAPIKeyBody.id;
      const { _source: agentDoc } = await esClient.get({
        index: '.fleet-agents',
        id: 'agent1',
      });
      // @ts-expect-error agentDoc has unknown type
      agentDoc.access_api_key_id = accessAPIKeyId;
      // @ts-expect-error agentDoc has unknown type
      agentDoc.default_api_key_id = outputAPIKeyBody.id;
      // @ts-expect-error agentDoc has unknown type
      agentDoc.default_api_key = Buffer.from(
        `${outputAPIKeyBody.id}:${outputAPIKeyBody.api_key}`
      ).toString('base64');

      await esClient.update({
        index: '.fleet-agents',
        id: 'agent1',
        refresh: true,
        doc: agentDoc,
      });
    });
    afterEach(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/agents');
      await esArchiver.load('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });
    after(async () => {
      await esArchiver.unload('x-pack/platform/test/fixtures/es_archives/fleet/empty_fleet_server');
    });

    it('/agents/{agent_id}/unenroll should fail for hosted agent policy', async () => {
      // set policy to hosted
      await supertest
        .put(`/api/fleet/agent_policies/policy1`)
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'Test policy', namespace: 'default', is_managed: true })
        .expect(200);

      await supertest.post(`/api/fleet/agents/agent1/unenroll`).set('kbn-xsrf', 'xxx').expect(400);
    });

    it('/agents/{agent_id}/unenroll should allow from regular agent policy', async () => {
      // set policy to regular
      await supertest
        .put(`/api/fleet/agent_policies/policy1`)
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'Test policy', namespace: 'default', is_managed: false })
        .expect(200);
      await supertest.post(`/api/fleet/agents/agent1/unenroll`).set('kbn-xsrf', 'xxx').expect(200);
    });

    it('/agents/{agent_id}/unenroll { revoke: true } should invalidate related API keys', async () => {
      await supertest
        .post(`/api/fleet/agents/agent1/unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          revoke: true,
        })
        .expect(200);

      const { api_keys: accessAPIKeys } = await esClient.security.getApiKey({ id: accessAPIKeyId });
      expect(accessAPIKeys).length(1);
      expect(accessAPIKeys[0].invalidated).eql(true);

      const { api_keys: outputAPIKeys } = await esClient.security.getApiKey({ id: outputAPIKeyId });
      expect(outputAPIKeys).length(1);
      expect(outputAPIKeys[0].invalidated).eql(true);
    });

    it('/agents/bulk_unenroll should not allow unenroll from hosted agent policy', async () => {
      // set policy to hosted
      await supertest
        .put(`/api/fleet/agent_policies/policy1`)
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'Test policy', namespace: 'default', is_managed: true })
        .expect(200);

      // try to unenroll
      await supertest
        .post(`/api/fleet/agents/bulk_unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: ['agent2', 'agent3'],
        })
        // http request succeeds
        .expect(200);

      // but agents are still enrolled
      const [agent2data, agent3data] = await Promise.all([
        supertest.get(`/api/fleet/agents/agent2`),
        supertest.get(`/api/fleet/agents/agent3`),
      ]);
      expect(typeof agent2data.body.item.unenrollment_started_at).to.eql('undefined');
      expect(typeof agent2data.body.item.unenrolled_at).to.eql('undefined');
      expect(agent2data.body.item.active).to.eql(true);
      expect(typeof agent3data.body.item.unenrollment_started_at).to.be('undefined');
      expect(typeof agent3data.body.item.unenrolled_at).to.be('undefined');
      expect(agent2data.body.item.active).to.eql(true);

      const { body } = await supertest
        .get(`/api/fleet/agents/action_status`)
        .set('kbn-xsrf', 'xxx');
      const actionStatus = body.items[0];
      expect(actionStatus.status).to.eql('FAILED');
      expect(actionStatus.nbAgentsFailed).to.eql(2);
    });

    it('/agents/bulk_unenroll should allow to unenroll multiple agents by id from a regular agent policy', async () => {
      // set policy to regular
      await supertest
        .put(`/api/fleet/agent_policies/policy1`)
        .set('kbn-xsrf', 'xxx')
        .send({ name: 'Test policy', namespace: 'default', is_managed: false })
        .expect(200);
      await supertest
        .post(`/api/fleet/agents/bulk_unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: ['agent2', 'agent3'],
        });

      const [agent2data, agent3data] = await Promise.all([
        supertest.get(`/api/fleet/agents/agent2`),
        supertest.get(`/api/fleet/agents/agent3`),
      ]);

      expect(typeof agent2data.body.item.unenrollment_started_at).to.eql('string');
      expect(agent2data.body.item.active).to.eql(true);
      expect(typeof agent3data.body.item.unenrollment_started_at).to.be('string');
      expect(agent2data.body.item.active).to.eql(true);
    });

    it('/agents/bulk_unenroll should allow to unenroll multiple agents by kuery', async () => {
      await supertest
        .post(`/api/fleet/agents/bulk_unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: 'active: true',
          revoke: true,
        })
        .expect(200);

      const { body } = await supertest.get(`/api/fleet/agents`);
      expect(body.total).to.eql(0);
    });

    it('/agents/bulk_unenroll should allow to unenroll active and inactive agents by kuery with includeInactive', async () => {
      // Agent inactive
      await esClient.update({
        id: 'agent4',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        doc: {
          policy_id: 'policy1',
          policy_revision_idx: 1,
          last_checkin: new Date(Date.now() - 1000 * 60).toISOString(), // policy timeout 1 min
        },
      });
      // unenroll all agents that had last checkin before "now"
      await supertest
        .post(`/api/fleet/agents/bulk_unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: `last_checkin<="${new Date(Date.now()).toISOString()}"`,
          revoke: true,
          includeInactive: true,
        })
        .expect(200);

      const { body } = await supertest.get(`/api/fleet/agents`);
      expect(body.total).to.eql(0);
    });
    it('/agents/bulk_unenroll should allow to unenroll inactive agents that never had last checkin by kuery with includeInactive', async () => {
      // Agent inactive
      await esClient.update({
        id: 'agent4',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        doc: {
          policy_id: 'policy1',
          policy_revision_idx: 1,
          last_checkin: new Date(Date.now() - 1000 * 60).toISOString(), // policy timeout 1 min
        },
      });
      // agent inactive through enrolled_at as no last_checkin
      await esClient.create({
        id: 'agent5',
        refresh: 'wait_for',
        index: AGENTS_INDEX,
        document: {
          active: true,
          access_api_key_id: 'api-key-4',
          policy_id: 'policy1',
          type: 'PERMANENT',
          local_metadata: { host: { hostname: 'host6' } },
          user_provided_metadata: {},
          enrolled_at: new Date(Date.now() - 1000 * 60).toISOString(), // policy timeout 1 min
        },
      });
      // unenroll all agents
      await supertest
        .post(`/api/fleet/agents/bulk_unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: 'active: true',
          revoke: true,
          includeInactive: true,
        })
        .expect(200);

      const { body } = await supertest.get(`/api/fleet/agents`);
      expect(body.total).to.eql(0);
    });

    it('/agents/bulk_unenroll should allow to unenroll multiple agents by kuery in batches async', async () => {
      const { body } = await supertest
        .post(`/api/fleet/agents/bulk_unenroll`)
        .set('kbn-xsrf', 'xxx')
        .send({
          agents: 'active: true',
          revoke: false,
          batchSize: 2,
        })
        .expect(200);

      const actionId = body.actionId;
      await checkBulkAgentAction(supertest, actionId);
    });

    describe('agentless agents', () => {
      const getAgentDoc = async (agentId: string) => {
        const { _source: agentDoc } = await esClient.get<{
          active: boolean;
          unenrolled_at?: string;
          unenrollment_started_at?: string;
        }>({ index: AGENTS_INDEX, id: agentId });
        return agentDoc;
      };

      const expectAgentNotUnenrolled = async (agentId: string) => {
        const agentDoc = await getAgentDoc(agentId);
        expect(agentDoc?.active).to.be(true);
        expect(agentDoc?.unenrolled_at).to.be(undefined);
        expect(agentDoc?.unenrollment_started_at).to.be(undefined);
      };

      beforeEach(async () => {
        // agent1 and agent2 are enrolled in policy1: make it an agentless policy.
        // Setting the flag through the API would deploy a real agentless agent.
        await kibanaServer.savedObjects.update({
          type: AGENT_POLICY_SAVED_OBJECT_TYPE,
          id: 'policy1',
          attributes: { supports_agentless: true },
        });
      });

      it('/agents/{agent_id}/unenroll should fail for an agentless agent by default', async () => {
        await supertest
          .post(`/api/fleet/agents/agent1/unenroll`)
          .set('kbn-xsrf', 'xxx')
          .expect(400);
        await supertest
          .post(`/api/fleet/agents/agent1/unenroll`)
          .set('kbn-xsrf', 'xxx')
          .send({ revoke: true })
          .expect(400);

        await expectAgentNotUnenrolled('agent1');
      });

      it('/agents/{agent_id}/unenroll { force: true, revoke: true } should unenroll an agentless agent', async () => {
        await supertest
          .post(`/api/fleet/agents/agent1/unenroll`)
          .set('kbn-xsrf', 'xxx')
          .send({ force: true, revoke: true })
          .expect(200);

        const agentDoc = await getAgentDoc('agent1');
        expect(agentDoc?.active).to.be(false);
        expect(agentDoc?.unenrolled_at).to.be.a('string');
      });

      it('/agents/bulk_unenroll should not unenroll agentless agents by default', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_unenroll`)
          .set('kbn-xsrf', 'xxx')
          .send({ agents: ['agent1', 'agent2'] })
          .expect(200);

        await expectAgentNotUnenrolled('agent1');
        await expectAgentNotUnenrolled('agent2');
      });

      it('/agents/bulk_unenroll { force: true, revoke: true } should unenroll agentless agents', async () => {
        await supertest
          .post(`/api/fleet/agents/bulk_unenroll`)
          .set('kbn-xsrf', 'xxx')
          .send({ agents: ['agent1', 'agent2'], force: true, revoke: true })
          .expect(200);

        for (const agentId of ['agent1', 'agent2']) {
          const agentDoc = await getAgentDoc(agentId);
          expect(agentDoc?.active).to.be(false);
          expect(agentDoc?.unenrolled_at).to.be.a('string');
        }
      });

      it('should unenroll the agents of an agentless policy when the policy is deleted (skipAgentlessValidation)', async () => {
        // deleting an agentless policy unenrolls its agents internally, bypassing the agentless validation
        await supertest
          .post(`/api/fleet/agent_policies/delete`)
          .set('kbn-xsrf', 'xxx')
          .send({ agentPolicyId: 'policy1', force: true })
          .expect(200);

        for (const agentId of ['agent1', 'agent2']) {
          const agentDoc = await getAgentDoc(agentId);
          expect(agentDoc?.active).to.be(false);
          expect(agentDoc?.unenrolled_at).to.be.a('string');
        }
      });
    });
  });
}
