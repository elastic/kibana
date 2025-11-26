/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import pRetry from 'p-retry';
import expect from '@kbn/expect';
import { AGENTS_INDEX, AGENT_POLICY_INDEX } from '@kbn/fleet-plugin/common';
import type { FtrProviderContext } from '../../../api_integration/ftr_provider_context';

export async function createAgentDoc(
  providerContext: FtrProviderContext,
  id: string,
  policyId: string,
  additionalData: any = {}
) {
  const { getService } = providerContext;
  const es = getService('es');
  const lastCheckin = new Date().toISOString();

  await es.index({
    index: AGENTS_INDEX,
    id,
    document: {
      id,
      type: 'PERMANENT',
      active: true,
      enrolled_at: new Date().toISOString(),
      last_checkin: lastCheckin,
      policy_id: policyId,
      policy_revision: 1,
      policy_revision_idx: 1,
      agent: {
        id,
        version: '9.3.0',
      },
      local_metadata: {
        elastic: {
          agent: {
            version: '9.3.0',
            upgradeable: true,
          },
        },
      },
      ...additionalData,
    },
    refresh: 'wait_for',
  });
}

export async function cleanupAgentDocs(providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es = getService('es');

  try {
    await es.deleteByQuery({
      index: AGENTS_INDEX,
      refresh: true,
      query: {
        match_all: {},
      },
    });
  } catch (err) {
    // index doesn't exist
  }
}

async function createPolicyRevision(
  providerContext: FtrProviderContext,
  policyId: string,
  revisionIdx: number
) {
  const { getService } = providerContext;
  const es = getService('es');

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

export async function createPolicyRevisions(
  providerContext: FtrProviderContext,
  policyId: string,
  count: number
) {
  const promises = [];
  for (let i = 1; i <= count; i++) {
    promises.push(createPolicyRevision(providerContext, policyId, 1 + i));
  }
  await Promise.all(promises);
}

export async function assertPolicyRevisions(
  providerContext: FtrProviderContext,
  policyId: string,
  expectedCount: number,
  expectedIndexes: number[]
) {
  const { getService } = providerContext;
  const es = getService('es');

  return pRetry(
    async () => {
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

      const revisions = result.hits.hits.map((hit: any) => ({
        id: hit._id,
        revision_idx: hit._source.revision_idx,
      }));

      if (expectedCount !== undefined) {
        expect(revisions.length).to.eql(expectedCount);
      }

      if (expectedIndexes !== undefined) {
        const revisionIndexes = revisions.map((r) => r.revision_idx).sort((a, b) => a - b);
        expect(revisionIndexes).to.eql(expectedIndexes);
      }
    },
    {
      retries: 5,
      minTimeout: 1000,
    }
  );
}

export async function cleanupPolicyRevisions(providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const es = getService('es');

  await es.deleteByQuery({
    index: AGENT_POLICY_INDEX,
    ignore_unavailable: true,
    refresh: true,
    query: {
      match_all: {},
    },
  });
}

const arrFromRange = (start: number, end: number) => {
  return Array.from({ length: end - start + 1 }, (_, i) => i + start);
};

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const MAX_REVISIONS = 5;
  let testPolicyId: string;

  const runAgentPolicyRevisionsCleanup = () => {
    return supertest
      .post(`/internal/fleet/agent_policies/_cleanup_revisions`)
      .set('kbn-xsrf', 'xxxx')
      .set('elastic-api-version', '1')
      .send({ maxRevisions: MAX_REVISIONS })
      .expect(200);
  };

  describe('Fleet Agent Policy Revisions Cleanup', () => {
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

    // With revision counts, the creation of the policy includes an implicit revision 1
    it('should not clean up policies with revisions equal to max_revisions limit', async () => {
      const revisionsToCreate = MAX_REVISIONS - 1;
      await createPolicyRevisions(providerContext, testPolicyId, revisionsToCreate);

      await runAgentPolicyRevisionsCleanup();

      await assertPolicyRevisions(
        providerContext,
        testPolicyId,
        MAX_REVISIONS,
        arrFromRange(1, MAX_REVISIONS)
      );
    });

    it('should clean up policies with revisions exceeding max_revisions limit', async () => {
      const numRevisionsToAdd = MAX_REVISIONS + 3;
      await createPolicyRevisions(providerContext, testPolicyId, numRevisionsToAdd);

      await runAgentPolicyRevisionsCleanup();

      await assertPolicyRevisions(providerContext, testPolicyId, MAX_REVISIONS, arrFromRange(5, 9));
    });

    it('should preserve all revisions above the minimum used revision by an agent', async () => {
      const numRevisionsToAdd = MAX_REVISIONS + 6;
      await createPolicyRevisions(providerContext, testPolicyId, numRevisionsToAdd);

      // Create agents using older revisions that would normally be cleaned up
      await createAgentDoc(providerContext, 'agent1', testPolicyId, {
        policy_revision_idx: 7,
      });
      await createAgentDoc(providerContext, 'agent2', testPolicyId, {
        policy_revision_idx: 6,
      });

      // Should keep all revisions from 2 and up. Min agent revision is 6, so 6 - 5 (max revisions) = 1, so keep from revision 2 and up
      await runAgentPolicyRevisionsCleanup();

      await assertPolicyRevisions(
        providerContext,
        testPolicyId,
        numRevisionsToAdd,
        arrFromRange(2, 12)
      );
    });

    it('should not make any deletions if minimum used revision minus max_revisions has an offset at or idx 0', async () => {
      const numRevisionsToAdd = MAX_REVISIONS + 3;
      await createPolicyRevisions(providerContext, testPolicyId, numRevisionsToAdd);
      // Create agents using older revisions that would normally be cleaned up
      await createAgentDoc(providerContext, 'agent1', testPolicyId, {
        policy_revision_idx: 2,
      });

      const expectedRevisionsCount = numRevisionsToAdd + 1;

      await runAgentPolicyRevisionsCleanup();

      await assertPolicyRevisions(
        providerContext,
        testPolicyId,
        expectedRevisionsCount,
        arrFromRange(1, expectedRevisionsCount)
      );
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
      const testPolicyId2 = agentPolicyResponse2.item.id;

      try {
        const policy1RevisionsToAdd = MAX_REVISIONS + 3;
        const policy2RevisionsToAdd = MAX_REVISIONS + 2;
        await createPolicyRevisions(providerContext, testPolicyId, policy1RevisionsToAdd);
        await createPolicyRevisions(providerContext, testPolicyId2, policy2RevisionsToAdd);

        await runAgentPolicyRevisionsCleanup();

        await assertPolicyRevisions(
          providerContext,
          testPolicyId,
          MAX_REVISIONS,
          arrFromRange(5, 9)
        );
        await assertPolicyRevisions(
          providerContext,
          testPolicyId2,
          MAX_REVISIONS,
          arrFromRange(4, 8)
        );
      } finally {
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .send({ agentPolicyId: testPolicyId2 })
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      }
    });
  });
}
