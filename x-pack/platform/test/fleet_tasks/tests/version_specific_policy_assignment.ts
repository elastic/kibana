/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { AGENT_POLICY_VERSION_SEPARATOR } from '@kbn/fleet-plugin/common/constants';
import type { FtrProviderContextWithServices } from '../ftr_provider_context';
import { cleanupAgentDocs, createAgentDoc } from '../helpers';

export default function (providerContext: FtrProviderContextWithServices) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');
  const TASK_INTERVAL = 30000; // as set in the config

  let policyId: string;

  async function waitForTask() {
    // Sleep for the duration of the task interval plus buffer for processing
    await new Promise((resolve) => setTimeout(resolve, TASK_INTERVAL + 5000));
  }

  async function getAgent(agentId: string) {
    const res = await supertest.get(`/api/fleet/agents/${agentId}`).set('kbn-xsrf', 'xxx');
    return res.body.item;
  }

  async function getFleetPolicies(baseId: string) {
    const res = await es.search({
      index: '.fleet-policies',
      query: {
        term: {
          policy_base_id: baseId,
        },
      },
      size: 100,
    });
    return res.hits.hits.map((hit) => hit._source as any);
  }

  describe('Version specific policy assignment', () => {
    // Use unique name to avoid conflicts from previous failed runs
    const testPolicyName = `Version Specific Test Policy ${Date.now()}`;

    before(async () => {
      await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxxx').expect(200);

      // Create an agent policy with version conditions enabled
      // Note: We don't add package policies because the system package doesn't have
      // version conditions, which would reset has_agent_version_conditions to false.
      // The core reassignment logic works without package policies.
      const { body: agentPolicyResponse } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: testPolicyName,
          namespace: 'default',
          has_agent_version_conditions: true,
        })
        .expect(200);
      policyId = agentPolicyResponse.item.id;
    });

    after(async () => {
      // Cleanup agent policy
      if (policyId) {
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .send({ agentPolicyId: policyId })
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      }
    });

    afterEach(async () => {
      await cleanupAgentDocs(providerContext);
    });

    it('should reassign agents on parent policy to version-specific policies', async () => {
      // Create an agent on the parent policy
      await createAgentDoc(providerContext, 'agent1', policyId, '8.18.0');

      await waitForTask();

      // Agent should be reassigned to versioned policy
      await retry.tryForTime(30000, async () => {
        const agent = await getAgent('agent1');
        const expectedVersionedPolicyId = `${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`;
        expect(agent.policy_id).to.be(expectedVersionedPolicyId);
      });

      const agent = await getAgent('agent1');
      expect(agent.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`);
    });

    it('should group agents by minor version', async () => {
      // Create agents with different versions
      await createAgentDoc(providerContext, 'agent1', policyId, '8.18.0');
      await createAgentDoc(providerContext, 'agent2', policyId, '8.18.1'); // Same minor version
      await createAgentDoc(providerContext, 'agent3', policyId, '9.3.0'); // Different minor version

      await waitForTask();

      // Agents should be grouped by minor version
      await retry.tryForTime(30000, async () => {
        const agent1 = await getAgent('agent1');
        const agent2 = await getAgent('agent2');
        const agent3 = await getAgent('agent3');

        expect(agent1.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`);
        expect(agent2.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`);
        expect(agent3.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}9.3`);
      });

      const agent1 = await getAgent('agent1');
      const agent2 = await getAgent('agent2');
      const agent3 = await getAgent('agent3');

      // 8.18.0 and 8.18.1 should be on the same 8.18 versioned policy
      expect(agent1.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`);
      expect(agent2.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`);
      // 9.3.0 should be on 9.3 versioned policy
      expect(agent3.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}9.3`);
    });

    it('should create version-specific policies in .fleet-policies index', async () => {
      // Create an agent that will trigger policy creation
      await createAgentDoc(providerContext, 'agent1', policyId, '8.18.0');

      await waitForTask();

      // Wait for the agent to be reassigned
      await retry.tryForTime(30000, async () => {
        const agent = await getAgent('agent1');
        expect(agent.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`);
      });

      // Check that versioned policy was created in .fleet-policies
      const fleetPolicies = await getFleetPolicies(policyId);
      const versionedPolicy = fleetPolicies.find(
        (p: any) => p.policy_id === `${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`
      );

      expect(versionedPolicy).to.not.be(undefined);
      expect(versionedPolicy.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`);
    });

    it('should skip agents already on correct versioned policy', async () => {
      const versionedPolicyId = `${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`;

      // First, create an agent on parent policy and wait for it to be reassigned
      await createAgentDoc(providerContext, 'agent1', policyId, '8.18.0');
      await waitForTask();

      await retry.tryForTime(30000, async () => {
        const agent = await getAgent('agent1');
        expect(agent.policy_id).to.be(versionedPolicyId);
      });

      // Create another agent already on the correct versioned policy.
      // Note: Policy revision doesn't matter - agents on the correct versioned policy
      // will receive policy updates automatically through fleet-server after deployPolicies
      // updates .fleet-policies, so they don't need reassignment.
      await createAgentDoc(providerContext, 'agent2', versionedPolicyId, '8.18.0');

      await waitForTask();

      // agent2 should still be on the versioned policy (not reassigned again)
      const agent2 = await getAgent('agent2');
      expect(agent2.policy_id).to.be(versionedPolicyId);
    });

    it('should reassign agents inactive by timeout but not unenrolled agents', async () => {
      // Create an active agent, an agent inactive by timeout and an unenrolled agent
      await createAgentDoc(providerContext, 'agent1', policyId, '8.18.0', true);
      await createAgentDoc(providerContext, 'agent2', policyId, '8.18.0', false); // inactive by timeout
      await createAgentDoc(providerContext, 'agent3', policyId, '8.18.0', true, { active: false }); // unenrolled

      await waitForTask();

      // Wait for the agents to be reassigned
      const versionedPolicyId = `${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`;
      await retry.tryForTime(30000, async () => {
        const agent = await getAgent('agent1');
        expect(agent.policy_id).to.be(versionedPolicyId);
      });

      // Moving an agent inactive by timeout is a metadata update, so it never stays on a missing policy
      const agent2 = await getAgent('agent2');
      expect(agent2.policy_id).to.be(versionedPolicyId);

      // Unenrolled agent should remain on parent policy
      const agent3 = await getAgent('agent3');
      expect(agent3.policy_id).to.be(policyId);
    });

    it('should reassign an agent on the sentinel policy that is inactive by timeout exactly once', async () => {
      const sentinelPolicyId = `${policyId}${AGENT_POLICY_VERSION_SEPARATOR}sentinel`;
      await createAgentDoc(
        providerContext,
        'inactive-sentinel-agent',
        sentinelPolicyId,
        '8.18.0',
        false
      );

      await waitForTask();

      const versionedPolicyId = `${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`;
      await retry.tryForTime(30000, async () => {
        const agent = await getAgent('inactive-sentinel-agent');
        expect(agent.policy_id).to.be(versionedPolicyId);
      });

      // one reassign action for the agent, not one per selection of the task
      await waitForTask();
      const actions = await es.search({
        index: '.fleet-actions',
        q: 'agents:inactive-sentinel-agent',
      });
      expect(actions.hits.hits.length).to.be(1);
      expect((actions.hits.hits[0]._source as any).type).to.be('POLICY_REASSIGN');
    });

    it('should reassign a legacy agent without policy_base_id on the sentinel policy', async () => {
      // agent documents written before policy_base_id was added only have policy_id
      const sentinelPolicyId = `${policyId}${AGENT_POLICY_VERSION_SEPARATOR}sentinel`;
      await createAgentDoc(providerContext, 'legacy-sentinel-agent', sentinelPolicyId, '8.18.0');
      const agentDoc = await es.get<{ policy_base_id?: string }>({
        index: '.fleet-agents',
        id: 'legacy-sentinel-agent',
      });
      expect(agentDoc._source?.policy_base_id).to.be(undefined);

      await waitForTask();

      await retry.tryForTime(30000, async () => {
        const agent = await getAgent('legacy-sentinel-agent');
        expect(agent.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`);
      });
    });

    // The task looks for the agent policies that have agents to assign with one search for a page of
    // policies, and then finds the agents of each policy with another query. Both have to select the same
    // agents: an agent that only the second query would select is never reached.
    it('should select the same agents when looking for the agent policies with agents to assign and when assigning them', async () => {
      const { body: secondPolicyResponse } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `Selection Test Policy ${Date.now()}`,
          namespace: 'default',
          has_agent_version_conditions: true,
        })
        .expect(200);
      const secondPolicyId = secondPolicyResponse.item.id;

      const variant = (id: string, minor: string) =>
        `${id}${AGENT_POLICY_VERSION_SEPARATOR}${minor}`;
      const sentinel = (id: string) => `${id}${AGENT_POLICY_VERSION_SEPARATOR}sentinel`;
      const recentlyUpgraded = new Date().toISOString();
      const longAgoUpgraded = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      // Agents without `policy_base_id` are agents enrolled by an older fleet-server. The agents of 8.17
      // on the 8.16 policy, a policy that does not match their version, are moved to the 8.17 policy
      // whenever they were upgraded. The agents of 8.16 on the 8.16 policy stay.
      const agents: Array<{
        id: string;
        policy: string;
        version: string;
        extra: Record<string, unknown>;
        // the policy the task leaves the agent on, undefined when it is moved to the policy of its version
        stays?: string;
        // the minor of the policy the agent is moved to, when it is not 8.18
        movesTo?: string;
      }> = [
        { id: 'plain', policy: policyId, version: '8.18.0', extra: {} },
        {
          id: 'plain-with-base',
          policy: policyId,
          version: '8.18.0',
          extra: { policy_base_id: policyId },
        },
        { id: 'sentinel', policy: sentinel(policyId), version: '8.18.0', extra: {} },
        {
          id: 'sentinel-with-base',
          policy: sentinel(policyId),
          version: '8.18.0',
          extra: { policy_base_id: policyId },
        },
        {
          id: 'upgraded-variant',
          policy: variant(policyId, '8.17'),
          version: '8.18.0',
          extra: { upgraded_at: recentlyUpgraded },
        },
        {
          id: 'upgraded-variant-with-base',
          policy: variant(policyId, '8.17'),
          version: '8.18.0',
          extra: { upgraded_at: recentlyUpgraded, policy_base_id: policyId },
        },
        {
          id: 'old-upgrade-variant',
          policy: variant(policyId, '8.16'),
          version: '8.17.0',
          extra: { upgraded_at: longAgoUpgraded },
          movesTo: '8.17',
        },
        {
          id: 'old-upgrade-variant-with-base',
          policy: variant(policyId, '8.16'),
          version: '8.17.0',
          extra: { upgraded_at: longAgoUpgraded, policy_base_id: policyId },
          movesTo: '8.17',
        },
        {
          id: 'variant-never-upgraded',
          policy: variant(policyId, '8.16'),
          version: '8.17.0',
          extra: {},
          movesTo: '8.17',
        },
        {
          id: 'matching-variant',
          policy: variant(policyId, '8.16'),
          version: '8.16.1',
          extra: { upgraded_at: longAgoUpgraded },
          stays: variant(policyId, '8.16'),
        },
        {
          id: 'matching-variant-with-base',
          policy: variant(policyId, '8.16'),
          version: '8.16.1',
          extra: { policy_base_id: policyId },
          stays: variant(policyId, '8.16'),
        },
        {
          id: 'unenrolled',
          policy: policyId,
          version: '8.18.0',
          extra: { active: false },
          stays: policyId,
        },
        // agents of the other policy of the same page
        { id: 'second-policy-plain', policy: secondPolicyId, version: '8.18.0', extra: {} },
        {
          id: 'second-policy-upgraded',
          policy: variant(secondPolicyId, '8.17'),
          version: '8.18.0',
          extra: { upgraded_at: recentlyUpgraded },
        },
      ];

      try {
        // The agents that are on the 8.17 and 8.16 policies need their documents: the sweep of the orphans
        // moves the agents of a version specific policy that does not exist. An agent of each version
        // makes the task deploy its policy.
        for (const [primer, version] of [
          ['primer-8-17', '8.17.0'],
          ['primer-8-16', '8.16.0'],
        ]) {
          await createAgentDoc(providerContext, primer, policyId, version);
        }
        await waitForTask();
        await retry.tryForTime(60000, async () => {
          expect((await getAgent('primer-8-17')).policy_id).to.be(variant(policyId, '8.17'));
          expect((await getAgent('primer-8-16')).policy_id).to.be(variant(policyId, '8.16'));
        });

        for (const { id, policy, version, extra } of agents) {
          await createAgentDoc(providerContext, id, policy, version, true, extra);
        }

        await waitForTask();

        // the selected agents are moved to the policy of their version
        await retry.tryForTime(60000, async () => {
          for (const { id, policy, stays, movesTo = '8.18' } of agents) {
            if (stays !== undefined) continue;
            const base = policy.split(AGENT_POLICY_VERSION_SEPARATOR)[0];
            expect((await getAgent(id)).policy_id).to.be(variant(base, movesTo));
          }
        });

        // and the others stay where they are, in the same run of the task
        const expectedStaying: Record<string, string> = {};
        const actualStaying: Record<string, string> = {};
        for (const { id, stays } of agents) {
          if (stays === undefined) continue;
          expectedStaying[id] = stays;
          actualStaying[id] = (await getAgent(id)).policy_id;
        }
        expect(actualStaying).to.eql(expectedStaying);
      } finally {
        await cleanupAgentDocs(providerContext);
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .send({ agentPolicyId: secondPolicyId })
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      }
    });

    it('should not move OpAMP collectors', async () => {
      // collectors get no policy action to acknowledge, so a moved collector would stay updating
      await createAgentDoc(providerContext, 'agent1', policyId, '8.18.0');
      await createAgentDoc(providerContext, 'collector', policyId, '8.18.0', true, {
        type: 'OPAMP',
      });
      await waitForTask();

      await retry.tryForTime(30000, async () => {
        const agent = await getAgent('agent1');
        expect(agent.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`);
      });

      // the collectors are left on the policy, in the same run of the task
      expect((await getAgent('collector')).policy_id).to.be(policyId);
    });

    it('should handle agents with unparseable/invalid version gracefully', async () => {
      // Create an agent with an unparseable version (edge case)
      // The task uses semver.coerce() which will return null for invalid versions
      await createAgentDoc(providerContext, 'agent999', policyId, 'invalid-version');

      // Task should not throw
      await waitForTask();

      // Agent should remain on parent policy since we can't parse the version
      const agent = await getAgent('agent999');
      expect(agent.policy_id).to.be(policyId);
    });

    it('should reassign recently upgraded agents to correct versioned policy', async () => {
      const oldVersionedPolicyId = `${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.17`;
      const newVersionedPolicyId = `${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`;

      // Create an agent that was on 8.17 but just upgraded to 8.18
      await createAgentDoc(providerContext, 'agent1', oldVersionedPolicyId, '8.18.0', true, {
        upgraded_at: new Date().toISOString(), // recently upgraded
      });

      await waitForTask();

      // Agent should be reassigned to the 8.18 versioned policy
      await retry.tryForTime(30000, async () => {
        const agent = await getAgent('agent1');
        expect(agent.policy_id).to.be(newVersionedPolicyId);
      });

      const agent = await getAgent('agent1');
      expect(agent.policy_id).to.be(newVersionedPolicyId);
    });

    it('should handle multiple agent policies with version conditions', async () => {
      // Create a second agent policy with version conditions
      // Use unique name to avoid conflicts from previous failed runs
      const uniquePolicyName = `Second Version Specific Test Policy ${Date.now()}`;
      const { body: secondPolicyResponse } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: uniquePolicyName,
          namespace: 'default',
          has_agent_version_conditions: true,
        })
        .expect(200);
      const secondPolicyId = secondPolicyResponse.item.id;

      try {
        // Create agents on both policies
        await createAgentDoc(providerContext, 'agent1', policyId, '8.18.0');
        await createAgentDoc(providerContext, 'agent2', secondPolicyId, '9.0.0');

        await waitForTask();

        // Both agents should be reassigned to their respective versioned policies
        await retry.tryForTime(30000, async () => {
          const agent1 = await getAgent('agent1');
          const agent2 = await getAgent('agent2');
          expect(agent1.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`);
          expect(agent2.policy_id).to.be(`${secondPolicyId}${AGENT_POLICY_VERSION_SEPARATOR}9.0`);
        });

        const agent1 = await getAgent('agent1');
        const agent2 = await getAgent('agent2');

        expect(agent1.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`);
        expect(agent2.policy_id).to.be(`${secondPolicyId}${AGENT_POLICY_VERSION_SEPARATOR}9.0`);
      } finally {
        // Cleanup the second policy. Policy deletion is rejected while agents are assigned, so
        // remove the agent docs first and assert the deletion; a leftover version-conditioned
        // parent would break suites that run later with expensive queries disabled.
        await cleanupAgentDocs(providerContext);
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .send({ agentPolicyId: secondPolicyId })
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      }
    });

    it('should reassign a new agent to an already-compiled version without recompiling', async () => {
      // First enrollment: creates the inputs_for_versions["8.18"] entry
      await createAgentDoc(providerContext, 'agent1', policyId, '8.18.0');
      await waitForTask();

      await retry.tryForTime(30000, async () => {
        const agent = await getAgent('agent1');
        expect(agent.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`);
      });

      // Second enrollment: same version, inputs_for_versions["8.18"] now exists.
      // The task should skip recompilation but still deploy and reassign.
      await createAgentDoc(providerContext, 'agent2', policyId, '8.18.0');
      await waitForTask();

      await retry.tryForTime(30000, async () => {
        const agent = await getAgent('agent2');
        expect(agent.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`);
      });

      const agent2 = await getAgent('agent2');
      expect(agent2.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`);
    });

    it('should not process agent policies without version conditions', async () => {
      // Create an agent policy without version conditions
      // Use unique name to avoid conflicts from previous failed runs
      const uniquePolicyName = `Normal Policy Without Version Conditions ${Date.now()}`;
      const { body: normalPolicyResponse } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: uniquePolicyName,
          namespace: 'default',
          has_agent_version_conditions: false,
        })
        .expect(200);
      const normalPolicyId = normalPolicyResponse.item.id;

      try {
        // Create an agent on the normal policy
        await createAgentDoc(providerContext, 'agent1', normalPolicyId, '8.18.0');

        await waitForTask();

        // Wait a bit more to ensure task had time to process
        await new Promise((resolve) => setTimeout(resolve, 5000));

        // Agent should remain on the original policy (not reassigned)
        const agent = await getAgent('agent1');
        expect(agent.policy_id).to.be(normalPolicyId);
      } finally {
        // Cleanup
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .send({ agentPolicyId: normalPolicyId })
          .set('kbn-xsrf', 'xxxx');
      }
    });

    // ── Half A — stale variant cleanup (kibana#283077) ──────────────────────────────────────────
    //
    // The sweep previously skipped parents that still had `has_agent_version_conditions: true`,
    // so a variant for a version that fell out of the bounded set was never deleted even with
    // zero agents assigned. A stale variant that references a garbage-collected secret causes
    // fleet-server to crash-loop for the entire deployment.
    //
    // These tests write variant documents directly into `.fleet-policies` with a @timestamp 2 hours
    // in the past (safely past the 1-hour grace window), avoiding the need to wait an hour in CI.
    // The parent policy's `has_agent_version_conditions: true` flag is set during `before()`.

    it('Half A: deletes a stale out-of-set variant with zero agents once past the grace window', async () => {
      // 7.17 is always outside the bounded set (bounded set = current major.minor + prev minor +
      // prev-major's latest minor, all of which are 8.x or 9.x in any Kibana version we run).
      const staleVariantId = `${policyId}${AGENT_POLICY_VERSION_SEPARATOR}7.17`;
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      await es.index({
        index: '.fleet-policies',
        id: `${staleVariantId}:1`,
        document: {
          policy_id: staleVariantId,
          policy_base_id: policyId,
          revision_idx: 1,
          '@timestamp': twoHoursAgo,
          data: { id: staleVariantId, revision: 1, inputs: [], agent: { monitoring: {} } },
        },
        refresh: 'wait_for',
      });

      // Confirm the doc is present before the sweep runs.
      const before = await getFleetPolicies(policyId);
      expect(before.some((p: any) => p.policy_id === staleVariantId)).to.be(true);

      await waitForTask();

      // The sweep must delete the stale variant: out-of-set, zero agents, past grace window.
      await retry.tryForTime(30000, async () => {
        const after = await getFleetPolicies(policyId);
        expect(after.some((p: any) => p.policy_id === staleVariantId)).to.be(false);
      });
    });

    it('Half A negative: preserves an out-of-set variant when at least one agent is enrolled on it', async () => {
      const staleVariantId = `${policyId}${AGENT_POLICY_VERSION_SEPARATOR}7.17`;
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

      // Create an agent already assigned to the stale variant (simulates a downlevel enrolled agent).
      // policy_base_id is set so the deploy path can also find it via getAgentAssignedVersionsForPolicies.
      // Indexed before the variant document so no sweep can observe the variant with zero agents.
      await createAgentDoc(providerContext, 'agent-stale', staleVariantId, '7.17.0', true, {
        policy_base_id: policyId,
      });

      await es.index({
        index: '.fleet-policies',
        id: `${staleVariantId}:1`,
        document: {
          policy_id: staleVariantId,
          policy_base_id: policyId,
          revision_idx: 1,
          '@timestamp': twoHoursAgo,
          data: { id: staleVariantId, revision: 1, inputs: [], agent: { monitoring: {} } },
        },
        refresh: 'wait_for',
      });

      await waitForTask();

      // The variant must NOT be deleted — the pre-delete agent count check blocks deletion.
      await retry.tryForTime(30000, async () => {
        const after = await getFleetPolicies(policyId);
        expect(after.some((p: any) => p.policy_id === staleVariantId)).to.be(true);
      });

      // Cleanup the stale variant doc so it doesn't interfere with subsequent tests or task runs.
      await es.deleteByQuery({
        index: '.fleet-policies',
        refresh: true,
        query: { term: { policy_id: staleVariantId } },
      });
    });

    // ── Half B — out-of-set agent version gets a variant deployed by Phase 1 ─────────────────────
    //
    // When an agent running version 7.17.0 checks in against a policy with has_agent_version_conditions,
    // Phase 1 of the task detects that the agent needs a 7.17 variant and calls deployPolicies with
    // agentVersions: ['7.17']. The variant is deployed and the agent is reassigned to it.
    //
    // The full Half-B refresh scenario (an existing out-of-set variant getting refreshed by a policy
    // UPDATE via getAgentAssignedVersionsForPolicies) cannot be exercised via the REST API in this
    // test environment because the policy has no packages with conditions.agent.version, so any PUT
    // recomputes has_agent_version_conditions = false and wipes all variant docs. That code path is
    // covered at the unit level in version_specific_policies.test.ts.

    it('Half B: Phase 1 deploys an out-of-set variant and reassigns the agent to it', async () => {
      const outOfSetVariantId = `${policyId}${AGENT_POLICY_VERSION_SEPARATOR}7.17`;

      // Place an agent on the BASE policy. Phase 1 detects this, deploys a 7.17 variant (which is
      // outside the bounded set of current/prev-minor/prev-major), and reassigns the agent.
      await createAgentDoc(providerContext, 'agent-old', policyId, '7.17.0', true);

      await waitForTask();

      // The agent must be reassigned to the out-of-set 7.17 variant.
      await retry.tryForTime(30000, async () => {
        const agent = await getAgent('agent-old');
        expect(agent.policy_id).to.be(outOfSetVariantId);
      });

      // The variant document must exist in .fleet-policies.
      const fleetPolicies = await getFleetPolicies(policyId);
      const variantDoc = fleetPolicies.find((p: any) => p.policy_id === outOfSetVariantId);
      expect(variantDoc).to.not.be(undefined);
      expect(variantDoc.revision_idx).to.be.greaterThan(0);
    });
  });

  // Agents enrolled by a downlevel fleet-server after the last startup backfill have a versioned
  // `policy_id` but no `policy_base_id`. The sweep must still reassign them when the parent no
  // longer has version conditions, with `search.allow_expensive_queries` disabled.
}
