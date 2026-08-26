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

  async function getFleetPolicies(policyIdPrefix: string) {
    const res = await es.search({
      index: '.fleet-policies',
      query: {
        prefix: {
          policy_id: policyIdPrefix,
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

    it('should not reassign inactive agents', async () => {
      // Create an active agent and an inactive agent
      await createAgentDoc(providerContext, 'agent1', policyId, '8.18.0', true);
      await createAgentDoc(providerContext, 'agent2', policyId, '8.18.0', false); // inactive

      await waitForTask();

      // Wait for active agent to be reassigned
      await retry.tryForTime(30000, async () => {
        const agent = await getAgent('agent1');
        expect(agent.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`);
      });

      // Active agent should be reassigned
      const agent1 = await getAgent('agent1');
      expect(agent1.policy_id).to.be(`${policyId}${AGENT_POLICY_VERSION_SEPARATOR}8.18`);

      // Inactive agent should remain on parent policy
      const agent2 = await getAgent('agent2');
      expect(agent2.policy_id).to.be(policyId);
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
        // Cleanup the second policy
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .send({ agentPolicyId: secondPolicyId })
          .set('kbn-xsrf', 'xxxx');
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

      // Create an agent already assigned to the stale variant (simulates a downlevel enrolled agent).
      // policy_base_id is set so the deploy path can also find it via getAgentAssignedVersionsForPolicies.
      await createAgentDoc(providerContext, 'agent-stale', staleVariantId, '7.17.0', true, {
        policy_base_id: policyId,
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
}
