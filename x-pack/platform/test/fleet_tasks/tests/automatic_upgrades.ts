/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContextWithServices } from '../ftr_provider_context';
import { cleanupAgentDocs, createAgentDoc } from '../helpers';

export default function (providerContext: FtrProviderContextWithServices) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const TASK_INTERVAL = 30000; // as set in the config
  const RETRY_DELAY = 60000; // as set in the config
  let policyId: string;

  async function waitForTask() {
    // Sleep for the duration of the task interval.
    // In case of test flakiness, the sleep duration can be increased.
    await new Promise((resolve) => setTimeout(resolve, TASK_INTERVAL));
  }

  describe('Automatic agent upgrades', () => {
    before(async () => {
      await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxxx').expect(200);
      const { body: agentPolicyResponse } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
          force: true,
        })
        .expect(200);
      policyId = agentPolicyResponse.item.id;
    });

    after(async () => {
      await supertest
        .post('/api/fleet/agent_policies/delete')
        .send({ agentPolicyId: policyId })
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    });

    afterEach(async () => {
      await cleanupAgentDocs(providerContext);
    });

    it('should only upgrade active agents', async () => {
      // Create an active agent and an inactive agent on 8.17.0.
      await createAgentDoc(providerContext, 'agent1', policyId, '8.17.0');
      await createAgentDoc(providerContext, 'agent2', policyId, '8.17.0', false);
      // Update the policy to require version 8.17.1 for all active agents.
      await supertest
        .put(`/api/fleet/agent_policies/${policyId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
          required_versions: [
            {
              version: '8.17.1',
              percentage: 100,
            },
          ],
        })
        .expect(200);
      await waitForTask();
      // Check that only the active agent was upgraded.
      let res = await supertest.get('/api/fleet/agents/agent1').set('kbn-xsrf', 'xxx').expect(200);
      expect(typeof res.body.item.upgrade_started_at).to.be('string');
      expect(res.body.item.upgrade_attempts.length).to.be(1);
      res = await supertest.get('/api/fleet/agents/agent2').set('kbn-xsrf', 'xxx').expect(200);
      expect(res.body.item.upgrade_started_at).to.be(undefined);
      expect(res.body.item.upgrade_attempts).to.be(undefined);
    });

    it('should take agents on target version into account', async () => {
      // Create 3 active agents on 8.17.0 and 1 active agent on 8.17.1.
      await createAgentDoc(providerContext, 'agent1', policyId, '8.17.0');
      await createAgentDoc(providerContext, 'agent2', policyId, '8.17.0');
      await createAgentDoc(providerContext, 'agent3', policyId, '8.17.0');
      await createAgentDoc(providerContext, 'agent4', policyId, '8.17.1');
      // Update the policy to require version 8.17.1 for 50% of active agents.
      await supertest
        .put(`/api/fleet/agent_policies/${policyId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
          required_versions: [
            {
              version: '8.17.1',
              percentage: 50,
            },
          ],
        })
        .expect(200);
      await waitForTask();
      // Check that only one agent on 8.17.0 was upgraded.
      const res = await supertest.get('/api/fleet/agents').set('kbn-xsrf', 'xxx').expect(200);
      expect(res.body.items.length).to.be(4);
      expect(res.body.items.filter((item: any) => item.status === 'updating').length).to.be(1);
      expect(
        res.body.items.filter((item: any) => item.upgrade_started_at !== undefined).length
      ).to.be(1);
      expect(
        res.body.items.filter((item: any) => item.upgrade_attempts !== undefined).length
      ).to.be(1);
    });

    it('should not take inactive agents on target version into account', async () => {
      // Create 2 active agents on 8.17.0, 1 active agent on 8.17.1 and 1 inactive agent on 8.17.1.
      await createAgentDoc(providerContext, 'agent1', policyId, '8.17.0');
      await createAgentDoc(providerContext, 'agent2', policyId, '8.17.0');
      await createAgentDoc(providerContext, 'agent3', policyId, '8.17.1');
      await createAgentDoc(providerContext, 'agent4', policyId, '8.17.1', false);
      // Update the policy to require version 8.17.1 for 50% of active agents.
      await supertest
        .put(`/api/fleet/agent_policies/${policyId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
          required_versions: [
            {
              version: '8.17.1',
              percentage: 50,
            },
          ],
        })
        .expect(200);
      await waitForTask();
      // Check that two agents on 8.17.0 were upgraded.
      const res = await supertest
        .get('/api/fleet/agents?showInactive=true')
        .set('kbn-xsrf', 'xxx')
        .expect(200);
      expect(res.body.items.length).to.be(4);
      expect(res.body.items.filter((item: any) => item.status === 'updating').length).to.be(1);
      expect(
        res.body.items.filter((item: any) => item.upgrade_started_at !== undefined).length
      ).to.be(1);
      expect(
        res.body.items.filter((item: any) => item.upgrade_attempts !== undefined).length
      ).to.be(1);
    });

    it('should take already upgrading agents into account', async () => {
      // Create an active agent on 8.17.0 and an active agent on 8.17.0 upgrading to 8.17.1.
      await createAgentDoc(providerContext, 'agent1', policyId, '8.17.0');
      await createAgentDoc(providerContext, 'agent2', policyId, '8.17.0', true, {
        upgrade_details: {
          target_version: '8.17.1',
          state: 'UPG_DOWNLOADING',
          action_id: '123',
        },
      });
      // Update the policy to require version 8.17.1 or 50% of active agents.
      await supertest
        .put(`/api/fleet/agent_policies/${policyId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
          required_versions: [
            {
              version: '8.17.1',
              percentage: 50,
            },
          ],
        })
        .expect(200);
      await waitForTask();
      // Check that no agent was upgraded.
      let res = await supertest.get('/api/fleet/agents/agent1').set('kbn-xsrf', 'xxx').expect(200);
      expect(res.body.item.upgrade_started_at).to.be(undefined);
      res = await supertest.get('/api/fleet/agents/agent2').set('kbn-xsrf', 'xxx').expect(200);
      expect(res.body.item.upgrade_started_at).to.be(undefined);
    });

    it('should take agents marked but not ready for retry into account but not upgrade them', async () => {
      // Create an active agent on 8.17.0 and an active agent on 8.17.0 marked but not ready for retry.
      await createAgentDoc(providerContext, 'agent1', policyId, '8.17.0');
      await createAgentDoc(providerContext, 'agent2', policyId, '8.17.0', true, {
        upgrade_details: {
          target_version: '8.17.1',
          state: 'UPG_FAILED',
          action_id: '123',
        },
        upgrade_attempts: [new Date().toISOString()],
      });
      // Update the policy to require version 8.17.1 for 50% of active agents.
      await supertest
        .put(`/api/fleet/agent_policies/${policyId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
          required_versions: [
            {
              version: '8.17.1',
              percentage: 50,
            },
          ],
        })
        .expect(200);
      await waitForTask();
      // Check that no agent was upgraded.
      let res = await supertest.get('/api/fleet/agents/agent1').set('kbn-xsrf', 'xxx').expect(200);
      expect(res.body.item.upgrade_started_at).to.be(undefined);
      res = await supertest.get('/api/fleet/agents/agent2').set('kbn-xsrf', 'xxx').expect(200);
      expect(res.body.item.upgrade_started_at).to.be(undefined);
    });

    it('should take agents marked and ready for retry into account and upgrade them', async () => {
      // Create an active agent on 8.17.0 and an active agent on 8.17.0 marked and ready for retry.
      await createAgentDoc(providerContext, 'agent1', policyId, '8.17.0');
      await createAgentDoc(providerContext, 'agent2', policyId, '8.17.0', true, {
        upgrade_details: {
          target_version: '8.17.1',
          state: 'UPG_FAILED',
          action_id: '123',
        },
        upgrade_attempts: [new Date(new Date().getTime() - RETRY_DELAY).toISOString()],
      });
      // Update the policy to require version 8.17.1 for 50% of active agents.
      await supertest
        .put(`/api/fleet/agent_policies/${policyId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy',
          namespace: 'default',
          required_versions: [
            {
              version: '8.17.1',
              percentage: 50,
            },
          ],
        })
        .expect(200);
      await waitForTask();
      // Check that agent1 was upgraded.
      let res = await supertest.get('/api/fleet/agents/agent1').set('kbn-xsrf', 'xxx').expect(200);
      expect(res.body.item.upgrade_started_at).to.be(undefined);
      res = await supertest.get('/api/fleet/agents/agent2').set('kbn-xsrf', 'xxx').expect(200);
      expect(typeof res.body.item.upgrade_started_at).to.be('string');
    });
  });
}
