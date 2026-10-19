/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import { AGENT_POLICY_SAVED_OBJECT_TYPE } from '@kbn/fleet-plugin/server/constants';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';
import { skipIfNoDockerRegistry } from '../../helpers';
import { SpaceTestApiClient } from './api_helper';
import { cleanFleetAgents, cleanFleetIndices, createTestSpace } from './helpers';

/**
 * Regression tests for the cross-space agentless-agent leak.
 *
 * .fleet-agents is not space-partitioned: an agent enrolled against a policy in space-a
 * is still returned by space-b's agents query. When showAgentless=false, the exclusion
 * filter must be built from ALL spaces via an unscoped SO client (+ spaceId '*').
 * Before the fix, the filter used a space-scoped client and missed cross-space policies,
 * letting agentless agents from other spaces appear in every space's list.
 */
export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;

  const supertest = getService('supertest');
  const esClient = getService('es');
  const kibanaServer = getService('kibanaServer');
  const spaces = getService('spaces');

  describe('agentless cross-space isolation', function () {
    skipIfNoDockerRegistry(providerContext);

    const apiClient = new SpaceTestApiClient(supertest);
    let TEST_SPACE_A: string;
    let TEST_SPACE_B: string;

    let agentlessPolicyId: string;
    let agentIdPlain: string;
    let agentIdVersioned: string;

    before(async () => {
      TEST_SPACE_A = spaces.getDefaultTestSpace();
      TEST_SPACE_B = `${spaces.getDefaultTestSpace()}-b`;

      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({ space: TEST_SPACE_A });
      await kibanaServer.savedObjects.cleanStandardList({ space: TEST_SPACE_B });
      await cleanFleetIndices(esClient);

      await Promise.all([
        createTestSpace(providerContext, TEST_SPACE_A),
        createTestSpace(providerContext, TEST_SPACE_B),
      ]);

      await apiClient.postEnableSpaceAwareness();

      // Create a regular policy in space A, then patch its SO to set supports_agentless: true.
      // Passing supports_agentless through the creation API would trigger checkAgentless(), which
      // rejects the flag unless the instance is running in a cloud/agentless-enabled config.
      // Patching the SO directly bypasses that gate and works in standard CI environments.
      const policyRes = await apiClient.createAgentPolicy(TEST_SPACE_A);
      agentlessPolicyId = policyRes.item.id;
      await kibanaServer.savedObjects.update({
        type: AGENT_POLICY_SAVED_OBJECT_TYPE,
        id: agentlessPolicyId,
        attributes: { supports_agentless: true },
        space: TEST_SPACE_A,
      });

      // Agent 1 (legacy): bare policy_id, no policy_base_id.
      // Exercises the fallback branch: match by policy_id + NOT exists(policy_base_id).
      const agentPlainRes = await esClient.index({
        index: AGENTS_INDEX,
        refresh: 'wait_for',
        document: {
          type: 'PERMANENT',
          active: true,
          enrolled_at: new Date().toISOString(),
          local_metadata: {
            host: { hostname: 'agentless-host-plain' },
            elastic: { agent: { version: '9.0.0' } },
          },
          user_provided_metadata: {},
          policy_id: agentlessPolicyId,
          // No policy_base_id — simulates a legacy/unmigrated agent doc.
          // namespaces: ['*'] so the agent is visible from every space via the space-awareness
          // namespace filter. Without this, agents scoped to TEST_SPACE_A are hidden from the
          // default space and space B before showAgentless is evaluated, making the negative
          // assertions vacuously true even without the fix.
          namespaces: ['*'],
        },
      });
      agentIdPlain = agentPlainRes._id;

      // Agent 2 (versioned): policy_id carries a version suffix; policy_base_id is the base UUID.
      // Exercises the primary branch: match by policy_base_id.
      const agentVersionedRes = await esClient.index({
        index: AGENTS_INDEX,
        refresh: 'wait_for',
        document: {
          type: 'PERMANENT',
          active: true,
          enrolled_at: new Date().toISOString(),
          local_metadata: {
            host: { hostname: 'agentless-host-versioned' },
            elastic: { agent: { version: '9.0.0' } },
          },
          user_provided_metadata: {},
          policy_id: `${agentlessPolicyId}#9.6`,
          policy_base_id: agentlessPolicyId,
          namespaces: ['*'],
        },
      });
      agentIdVersioned = agentVersionedRes._id;
    });

    after(async () => {
      await cleanFleetAgents(esClient);
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.savedObjects.cleanStandardList({ space: TEST_SPACE_A });
      await kibanaServer.savedObjects.cleanStandardList({ space: TEST_SPACE_B });
    });

    describe('GET /agents?showAgentless=false', () => {
      it('should exclude agentless agents from the default space even when the policy lives in another space', async () => {
        // Pre-check: confirm agents are visible from the default space with showAgentless=true.
        // Because namespaces is ['*'] they pass the space-awareness namespace filter, so any
        // exclusion below is solely due to the showAgentless filter — not a vacuous pass.
        const { body: withAgentless } = await supertest
          .get('/api/fleet/agents?showAgentless=true')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        const idsWithAgentless = withAgentless.items.map((a: { id: string }) => a.id);
        expect(idsWithAgentless).to.contain(agentIdPlain);
        expect(idsWithAgentless).to.contain(agentIdVersioned);

        // The default space owns no agentless policies. Before the fix, the guard
        // `agentlessPolicyIds.length > 0` was false (space-scoped client returned nothing),
        // so no filter was built and all agentless agents leaked through.
        const { body } = await supertest
          .get('/api/fleet/agents?showAgentless=false')
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const agentIds = body.items.map((a: { id: string }) => a.id);
        expect(agentIds).not.to.contain(agentIdPlain);
        expect(agentIds).not.to.contain(agentIdVersioned);
      });

      it('should exclude agentless agents from a space that does not own the agentless policy', async () => {
        // Pre-check: agents are visible from space B with showAgentless=true (namespaces: ['*']).
        const { body: withAgentless } = await supertest
          .get(`/s/${TEST_SPACE_B}/api/fleet/agents?showAgentless=true`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
        const idsWithAgentless = withAgentless.items.map((a: { id: string }) => a.id);
        expect(idsWithAgentless).to.contain(agentIdPlain);
        expect(idsWithAgentless).to.contain(agentIdVersioned);

        // Space B owns no agentless policies but the agents are still queryable from it
        // because .fleet-agents is not space-partitioned.
        const { body } = await supertest
          .get(`/s/${TEST_SPACE_B}/api/fleet/agents?showAgentless=false`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const agentIds = body.items.map((a: { id: string }) => a.id);
        expect(agentIds).not.to.contain(agentIdPlain);
        expect(agentIds).not.to.contain(agentIdVersioned);
      });

      it('should still show the agentless agents in the space that owns the policy when showAgentless=true', async () => {
        // Guard against over-filtering: the agents must remain visible in space A
        // when the caller explicitly opts in.
        const { body } = await supertest
          .get(`/s/${TEST_SPACE_A}/api/fleet/agents?showAgentless=true`)
          .set('kbn-xsrf', 'xxxx')
          .expect(200);

        const agentIds = body.items.map((a: { id: string }) => a.id);
        expect(agentIds).to.contain(agentIdPlain);
        expect(agentIds).to.contain(agentIdVersioned);
      });
    });
  });
}
