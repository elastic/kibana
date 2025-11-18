/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from 'expect';
import type { FtrProviderContextWithServices } from '../ftr_provider_context';
import {
  createAgentDoc,
  cleanupAgentDocs,
  createPolicyRevisions,
  getPolicyRevisions,
  cleanupPolicyRevisions,
} from '../helpers';

export default function (providerContext: FtrProviderContextWithServices) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const TASK_INTERVAL = 30000; // as set in the config (30s)
  const MAX_REVISIONS = 5; // as set in the config
  let testPolicyId: string;

  async function waitForTask() {
    // Sleep for the duration of the task interval plus a buffer.
    // In case of test flakiness, the sleep duration can be increased.
    await new Promise((resolve) => setTimeout(resolve, TASK_INTERVAL + 5000));
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
      await cleanupPolicyRevisions(providerContext);
    });

    it('should not clean up policies with revisions equal to max_revisions limit', async () => {
      await createPolicyRevisions(providerContext, testPolicyId, MAX_REVISIONS - 1);

      const initialRevisions = await getPolicyRevisions(providerContext, testPolicyId);
      expect(initialRevisions.length).toBe(MAX_REVISIONS);

      await waitForTask();

      const finalRevisions = await getPolicyRevisions(providerContext, testPolicyId);
      expect(finalRevisions.length).toBe(MAX_REVISIONS);
    });

    it('should clean up policies with revisions exceeding max_revisions limit', async () => {
      const totalRevisions = MAX_REVISIONS + 3;
      await createPolicyRevisions(providerContext, testPolicyId, totalRevisions);

      const initialRevisions = await getPolicyRevisions(providerContext, testPolicyId);
      expect(initialRevisions.length).toBe(totalRevisions + 1);

      await waitForTask();

      const finalRevisions = await getPolicyRevisions(providerContext, testPolicyId);
      expect(finalRevisions.length).toBe(MAX_REVISIONS);

      const remainingRevisions = await getPolicyRevisions(providerContext, testPolicyId);
      const expectedRevisions = [5, 6, 7, 8, 9]; // Should keep the 5 latest
      const actualRevisions = remainingRevisions.map((r) => r.revision_idx).sort((a, b) => a - b);
      expect(actualRevisions).toEqual(expectedRevisions);
    });

    it('should preserve all revisions above the minimum used revision by an agent', async () => {
      const totalRevisions = MAX_REVISIONS + 6;
      await createPolicyRevisions(providerContext, testPolicyId, totalRevisions);

      // Create agents using older revisions that would normally be cleaned up
      await createAgentDoc(providerContext, 'agent1', testPolicyId, '9.3.0', true, {
        policy_revision_idx: 7,
      });
      await createAgentDoc(providerContext, 'agent2', testPolicyId, '9.3.0', true, {
        policy_revision_idx: 6,
      });

      const initialRevisions = await getPolicyRevisions(providerContext, testPolicyId);
      expect(initialRevisions.length).toBe(totalRevisions + 1);

      await waitForTask();

      const remainingRevisions = await getPolicyRevisions(providerContext, testPolicyId);

      const expectedRevisions = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; // Should keep all revisions from 2 and up
      const actualRevisions = remainingRevisions.map((r) => r.revision_idx).sort((a, b) => a - b);
      expect(actualRevisions).toEqual(expectedRevisions);
    });

    it('should not make any deletions if minimum used revision minus max_revisions has an offset at or idx 0', async () => {
      const totalRevisions = MAX_REVISIONS + 3;
      await createPolicyRevisions(providerContext, testPolicyId, totalRevisions);

      // Create agents using older revisions that would normally be cleaned up
      await createAgentDoc(providerContext, 'agent1', testPolicyId, '9.3.0', true, {
        policy_revision_idx: 2,
      });

      const initialRevisions = await getPolicyRevisions(providerContext, testPolicyId);
      expect(initialRevisions.length).toBe(totalRevisions + 1);

      await waitForTask();

      const remainingRevisions = await getPolicyRevisions(providerContext, testPolicyId);

      expect(remainingRevisions.length).toEqual(initialRevisions.length);
    });

    it('should handle multiple policies in a single cleanup run', async () => {
      // Create a second policy
      const { body: agentPolicyResponse2 } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({
          name: 'Test policy 2',
          namespace: 'default',
        })
        .expect(200);
      const policyId2 = agentPolicyResponse2.item.id;

      try {
        const policy1Revisions = 8;
        const policy2Revisions = 7;
        await createPolicyRevisions(providerContext, testPolicyId, policy1Revisions);
        await createPolicyRevisions(providerContext, policyId2, policy2Revisions);

        const initialRevisions1 = await getPolicyRevisions(providerContext, testPolicyId);
        const initialRevisions2 = await getPolicyRevisions(providerContext, policyId2);
        expect(initialRevisions1.length).toBe(policy1Revisions + 1);
        expect(initialRevisions2.length).toBe(policy2Revisions + 1);

        await waitForTask();

        const finalRevisions1 = await getPolicyRevisions(providerContext, testPolicyId);
        const finalRevisions2 = await getPolicyRevisions(providerContext, policyId2);
        expect(finalRevisions1.length).toBe(MAX_REVISIONS);
        expect(finalRevisions2.length).toBe(MAX_REVISIONS);
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
