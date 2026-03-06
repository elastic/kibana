/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { SpaceTestApiClient } from '../../fleet_api_integration/apis/space_awareness/api_helper';
import type { FtrProviderContextWithServices } from '../ftr_provider_context';
import { cleanupAgentDocs, createAgentDoc } from '../helpers';

const TASK_INTERVAL_MS = 11000; // Slightly longer than config to allow task to run

export default function (providerContext: FtrProviderContextWithServices) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');
  const spaces = getService('spaces');
  let TEST_SPACE_1: string;
  let policyIdSpace1: string;

  let policyId: string;
  const UNENROLL_TIMEOUT_SECONDS = 60;
  const INACTIVITY_TIMEOUT_MS = 1209600 * 1000 - 10;

  async function waitForTask() {
    await new Promise((resolve) => setTimeout(resolve, TASK_INTERVAL_MS));
  }

  describe('Unenroll inactive agents task', () => {
    const apiClient = new SpaceTestApiClient(supertest);
    before(async () => {
      await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxxx').expect(200);
      const { body: agentPolicyResponse } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy for unenroll inactive',
          namespace: 'default',
          force: true,
          is_managed: false,
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

      await apiClient.deleteAgentPolicy(policyIdSpace1, TEST_SPACE_1);
    });

    afterEach(async () => {
      await supertest
        .put(`/api/fleet/agent_policies/${policyId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy for unenroll inactive',
          namespace: 'default',
          unenroll_timeout: 0,
        })
        .expect(200);
      await cleanupAgentDocs(providerContext);
      await es.deleteByQuery({
        index: '.fleet-actions',
        ignore_unavailable: true,
        query: {
          match_all: {},
        },
      });
    });

    it('should unenroll inactive agents when policy has unenroll_timeout set', async () => {
      await supertest
        .put(`/api/fleet/agent_policies/${policyId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy for unenroll inactive',
          namespace: 'default',
          unenroll_timeout: UNENROLL_TIMEOUT_SECONDS,
        })
        .expect(200);

      // inactive agent
      await createAgentDoc(providerContext, 'inactive-agent-1', policyId, '8.17.0', true, {
        last_checkin: new Date(Date.now() - INACTIVITY_TIMEOUT_MS).toISOString(),
      });

      await waitForTask();

      await retry.tryForTime(15000, async () => {
        const agentRes = await es.search({
          index: '.fleet-agents',
          ignore_unavailable: true,
          query: {
            term: {
              policy_id: policyId,
            },
          },
        });

        const agentDoc = agentRes.hits.hits[0]._source as any;
        if (agentDoc?.active || !agentDoc?.unenrolled_at) {
          throw new Error('Agent is still not unenrolled');
        }
      });
    });

    it('should unenroll inactive agents when policy has unenroll_timeout set in non-default space', async () => {
      TEST_SPACE_1 = spaces.getDefaultTestSpace();
      const spaceResp = await apiClient.createAgentPolicy(TEST_SPACE_1, {
        name: 'Test policy for unenroll inactive in space1',
        namespace: 'default',
        unenroll_timeout: UNENROLL_TIMEOUT_SECONDS,
      });
      policyIdSpace1 = spaceResp.item.id;

      // inactive agent
      await createAgentDoc(
        providerContext,
        'inactive-agent-space1',
        policyIdSpace1,
        '8.17.0',
        true,
        {
          namespaces: [TEST_SPACE_1],
          last_checkin: new Date(Date.now() - INACTIVITY_TIMEOUT_MS).toISOString(),
        }
      );

      await waitForTask();

      await retry.tryForTime(15000, async () => {
        const agentRes = await es.search({
          index: '.fleet-agents',
          ignore_unavailable: true,
          query: {
            term: {
              policy_id: policyIdSpace1,
            },
          },
        });

        const agentDoc = agentRes.hits.hits[0]._source as any;
        if (agentDoc?.active || !agentDoc?.unenrolled_at) {
          throw new Error('Agent is still not unenrolled');
        }
      });
    });

    it('should not unenroll active agents', async () => {
      await supertest
        .put(`/api/fleet/agent_policies/${policyId}`)
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy for unenroll inactive',
          namespace: 'default',
          unenroll_timeout: UNENROLL_TIMEOUT_SECONDS,
        })
        .expect(200);

      // Active agent: recent last_checkin
      await createAgentDoc(providerContext, 'active-agent-1', policyId, '8.17.0', true);

      await waitForTask();

      const agentRes = await es.search({
        index: '.fleet-agents',
        ignore_unavailable: true,
        query: {
          term: {
            policy_id: policyId,
          },
        },
      });
      const agentDoc = agentRes.hits.hits[0]._source as any;
      expect(agentDoc?.active).to.be(true);
      expect(agentDoc?.unenrolled_at).to.be(undefined);
    });

    it('should not unenroll inactive agents when policy has no unenroll_timeout', async () => {
      // Policy has no unenroll_timeout (default 0 or unset)
      await createAgentDoc(providerContext, 'inactive-agent-2', policyId, '8.17.0', false, {
        last_checkin: new Date(Date.now() - INACTIVITY_TIMEOUT_MS).toISOString(),
      });

      await waitForTask();

      const agentRes = await es.search({
        index: '.fleet-agents',
        ignore_unavailable: true,
        query: {
          term: {
            policy_id: policyId,
          },
        },
      });
      const agentDoc = agentRes.hits.hits[0]._source as any;
      expect(agentDoc?.active).to.be(true);
      expect(agentDoc?.unenrolled_at).to.be(undefined);
    });
  });
}
