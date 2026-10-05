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

  async function waitForTask() {
    await new Promise((resolve) => setTimeout(resolve, TASK_INTERVAL + 5000));
  }

  async function getAgent(agentId: string) {
    const res = await supertest.get(`/api/fleet/agents/${agentId}`).set('kbn-xsrf', 'xxx');
    return res.body.item;
  }

  async function getFleetPolicies(baseId: string) {
    const res = await es.search({
      index: '.fleet-policies',
      query: { term: { policy_base_id: baseId } },
      size: 100,
    });
    return res.hits.hits.map((hit) => hit._source as any);
  }

  // Separate file from `version_specific_policy_assignment`: Phase 1 of the task runs a wildcard
  // `policy_id:<id>#*` query for every policy with version conditions, which Elasticsearch rejects
  // while expensive queries are disabled and would abort the run before the orphan sweep. This
  // suite is loaded after that one, whose version-conditioned policy has been deleted by then.
  describe('orphaned agents without policy_base_id (expensive queries disabled)', () => {
    let parentId: string;
    const variantId = () => `${parentId}${AGENT_POLICY_VERSION_SEPARATOR}9.4`;

    async function indexVariantDoc() {
      await es.index({
        index: '.fleet-policies',
        id: `${variantId()}:1`,
        document: {
          policy_id: variantId(),
          policy_base_id: parentId,
          revision_idx: 1,
          '@timestamp': new Date().toISOString(),
          data: { id: variantId(), revision: 1, inputs: [], agent: { monitoring: {} } },
        },
        refresh: 'wait_for',
      });
    }

    before(async () => {
      await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxxx').expect(200);
      await es.cluster.putSettings({
        persistent: { 'search.allow_expensive_queries': false },
      });
      // Parent has NO version conditions, so any variant left behind is an orphan.
      const { body } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({ name: `Orphan No Base Id ${Date.now()}`, namespace: 'default' })
        .expect(200);
      parentId = body.item.id;
    });

    afterEach(async () => {
      await cleanupAgentDocs(providerContext);
    });

    after(async () => {
      await es.cluster.putSettings({
        persistent: { 'search.allow_expensive_queries': null },
      });
      await es.deleteByQuery({
        index: '.fleet-policies',
        refresh: true,
        query: { term: { policy_base_id: parentId } },
      });
      await supertest
        .post('/api/fleet/agent_policies/delete')
        .send({ agentPolicyId: parentId })
        .set('kbn-xsrf', 'xxxx')
        .expect(200);
    });

    it('reassigns an agent without policy_base_id and deletes the variant doc', async () => {
      await indexVariantDoc();
      await createAgentDoc(providerContext, 'agent-no-base', variantId(), '9.4.0');
      // Not an orphan: plain (non-versioned) policy id without policy_base_id.
      await createAgentDoc(providerContext, 'agent-plain', parentId, '9.4.0');

      await waitForTask();

      await retry.tryForTime(30000, async () => {
        const agent = await getAgent('agent-no-base');
        expect(agent.policy_id).to.be(parentId);
        const docs = await getFleetPolicies(parentId);
        expect(docs.some((p: any) => p.policy_id === variantId())).to.be(false);
      });
      expect((await getAgent('agent-plain')).policy_id).to.be(parentId);
    });

    it('reassigns an agent without policy_base_id when its variant doc is already gone', async () => {
      // No variant doc in `.fleet-policies` at all: parent is only discoverable via the agent.
      await createAgentDoc(providerContext, 'agent-no-base-no-doc', variantId(), '9.4.0');

      await waitForTask();

      await retry.tryForTime(30000, async () => {
        const agent = await getAgent('agent-no-base-no-doc');
        expect(agent.policy_id).to.be(parentId);
      });
    });
  });
}
