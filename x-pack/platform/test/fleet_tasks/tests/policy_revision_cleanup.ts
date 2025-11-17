/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import { AGENT_POLICY_INDEX } from '@kbn/fleet-plugin/common';
import type { FtrProviderContextWithServices } from '../ftr_provider_context';
import { createAgentDoc, cleanupAgentDocs } from '../helpers';

export default function (providerContext: FtrProviderContextWithServices) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const TASK_INTERVAL = 30000; // as set in the config (30s)
  const MAX_REVISIONS = 5; // as set in the config
  let testPolicyId: string;

  async function waitForTask() {
    // Sleep for the duration of the task interval plus a buffer.
    // In case of test flakiness, the sleep duration can be increased.
    await new Promise((resolve) => setTimeout(resolve, TASK_INTERVAL + 5000));
  }

  async function createPolicyRevision(policyId: string, revisionIdx: number) {
    const doc = {
      '@timestamp': new Date().toISOString(),
      policy_id: policyId,
      revision_idx: revisionIdx,
      data: {
        id: policyId,
        name: `Test Policy ${policyId}`,
        namespace: 'default',
        revision: revisionIdx,
        agent_features: [],
        inputs: [],
      },
    };

    await es.index({
      index: AGENT_POLICY_INDEX,
      id: `${policyId}:${revisionIdx}`,
      document: doc,
      refresh: 'wait_for',
    });
  }

  async function createMultiplePolicyRevisions(policyId: string, count: number) {
    const promises = [];
    for (let i = 1; i <= count; i++) {
      promises.push(createPolicyRevision(policyId, 1 + i));
    }
    await Promise.all(promises);
  }

  async function getPolicyRevisionCount(policyId: string): Promise<number> {
    const result = await es.search({
      index: AGENT_POLICY_INDEX,
      query: {
        term: {
          policy_id: policyId,
        },
      },
      size: 0,
    });
    const total = result.hits.total;
    return typeof total === 'number' ? total : total?.value || 0;
  }

  async function getPolicyRevisions(policyId: string) {
    const result = await es.search({
      index: AGENT_POLICY_INDEX,
      query: {
        term: {
          policy_id: policyId,
        },
      },
      sort: [{ revision_idx: { order: 'asc' } }],
      size: 1000,
    });
    return result.hits.hits.map((hit: any) => ({
      id: hit._id,
      revision_idx: hit._source.revision_idx,
    }));
  }

  async function cleanupPolicyRevisions() {
    await es.deleteByQuery({
      index: AGENT_POLICY_INDEX,
      ignore_unavailable: true,
      refresh: true,
      query: {
        match_all: {},
      },
    });
  }

  describe('Fleet Policy Revisions Cleanup Task', () => {
    before(async () => {
      await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxxx').expect(200);
    });

    beforeEach(async () => {
      const { body: agentPolicyResponse } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: `Test policy for cleanup ${Date.now()}`,
          namespace: 'default',
        })
        .expect(200);
      testPolicyId = agentPolicyResponse.item.id;
    });

    after(async () => {
      await supertest
        .post('/api/fleet/agent_policies/delete')
        .send({ agentPolicyId: testPolicyId })
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    });

    afterEach(async () => {
      await cleanupAgentDocs(providerContext);
      await cleanupPolicyRevisions();
    });

    it('should not clean up policies with revisions equal to max_revisions limit', async () => {
      await createMultiplePolicyRevisions(testPolicyId, MAX_REVISIONS - 1);

      const initialCount = await getPolicyRevisionCount(testPolicyId);
      expect(initialCount).toBe(MAX_REVISIONS);

      await waitForTask();

      const finalCount = await getPolicyRevisionCount(testPolicyId);
      expect(finalCount).toBe(MAX_REVISIONS);
    });

    it('should clean up policies with revisions exceeding max_revisions limit', async () => {
      const totalRevisions = MAX_REVISIONS + 3;
      await createMultiplePolicyRevisions(testPolicyId, totalRevisions);

      const initialCount = await getPolicyRevisionCount(testPolicyId);
      expect(initialCount).toBe(totalRevisions + 1);

      await waitForTask();

      const finalCount = await getPolicyRevisionCount(testPolicyId);
      expect(finalCount).toBe(MAX_REVISIONS);

      const remainingRevisions = await getPolicyRevisions(testPolicyId);
      const expectedRevisions = [5, 6, 7, 8, 9]; // Should keep the 5 latest
      const actualRevisions = remainingRevisions.map((r) => r.revision_idx).sort((a, b) => a - b);
      expect(actualRevisions).toEqual(expectedRevisions);
    });

    it('should preserve all revisions above the minimum used revision by an agent', async () => {
      const totalRevisions = MAX_REVISIONS + 6;
      await createMultiplePolicyRevisions(testPolicyId, totalRevisions);

      // Create agents using older revisions that would normally be cleaned up
      await createAgentDoc(providerContext, 'agent1', testPolicyId, '9.3.0', true, {
        policy_revision_idx: 7,
      });
      await createAgentDoc(providerContext, 'agent2', testPolicyId, '9.3.0', true, {
        policy_revision_idx: 6,
      });

      const initialCount = await getPolicyRevisionCount(testPolicyId);
      expect(initialCount).toBe(totalRevisions + 1);

      await waitForTask();

      const remainingRevisions = await getPolicyRevisions(testPolicyId);

      const expectedRevisions = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // Should keep all revisions from 6 and up
      const actualRevisions = remainingRevisions.map((r) => r.revision_idx).sort((a, b) => a - b);
      expect(actualRevisions).toEqual(expectedRevisions);
    });

    it('should not make any deletions if minimum used revision minus max_revisions has an offset at or idx 0', async () => {
      const totalRevisions = MAX_REVISIONS + 3;
      await createMultiplePolicyRevisions(testPolicyId, totalRevisions);

      // Create agents using older revisions that would normally be cleaned up
      await createAgentDoc(providerContext, 'agent1', testPolicyId, '9.3.0', true, {
        policy_revision_idx: 2,
      });

      const initialCount = await getPolicyRevisionCount(testPolicyId);
      expect(initialCount).toBe(totalRevisions + 1);

      await waitForTask();

      const remainingRevisions = await getPolicyRevisions(testPolicyId);

      expect(remainingRevisions.length).toEqual(initialCount);
    });

    it('should handle multiple policies in a single cleanup run', async () => {
      // Create a second policy
      const { body: agentPolicyResponse2 } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy 2 for cleanup',
          namespace: 'default',
          force: true,
        })
        .expect(200);
      const policyId2 = agentPolicyResponse2.item.id;

      try {
        const policy1Revisions = 8;
        const policy2Revisions = 7;
        await createMultiplePolicyRevisions(testPolicyId, policy1Revisions);
        await createMultiplePolicyRevisions(policyId2, policy2Revisions);

        const initialCount1 = await getPolicyRevisionCount(testPolicyId);
        const initialCount2 = await getPolicyRevisionCount(policyId2);
        expect(initialCount1).toBe(policy1Revisions + 1);
        expect(initialCount2).toBe(policy2Revisions + 1);

        await waitForTask();

        const finalCount1 = await getPolicyRevisionCount(testPolicyId);
        const finalCount2 = await getPolicyRevisionCount(policyId2);
        expect(finalCount1).toBe(MAX_REVISIONS);
        expect(finalCount2).toBe(MAX_REVISIONS);
      } finally {
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .send({ agentPolicyId: policyId2 })
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      }
    });
  });
}
