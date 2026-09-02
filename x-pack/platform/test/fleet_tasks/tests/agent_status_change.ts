/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AGENTS_INDEX } from '@kbn/fleet-plugin/common';
import { AGENT_STATUS_CHANGE_DATA_STREAM } from '@kbn/fleet-plugin/common/constants/agent';

import type { FtrProviderContextWithServices } from '../ftr_provider_context';
import { cleanupAgentDocs, createAgentDoc } from '../helpers';

const DEFAULT_DS_INDEX = `${AGENT_STATUS_CHANGE_DATA_STREAM.type}-${AGENT_STATUS_CHANGE_DATA_STREAM.dataset}-default`;

const TASK_INTERVAL_MS = 12000; // slightly longer than the 10s configured in config.ts

export default function (providerContext: FtrProviderContextWithServices) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');

  let policyId: string;
  let customPolicyId: string;

  describe('Agent status change task', () => {
    before(async () => {
      await supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxxx').expect(200);
      const { body } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({ name: 'Status change test policy', namespace: 'default', force: true })
        .expect(200);
      policyId = body.item.id;

      const { body: customBody } = await supertest
        .post('/api/fleet/agent_policies')
        .set('kbn-xsrf', 'xxxx')
        .send({ name: 'Custom namespace test policy', namespace: 'custom_namespace', force: true })
        .expect(200);
      customPolicyId = customBody.item.id;
    });

    after(async () => {
      if (policyId) {
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .send({ agentPolicyId: policyId })
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      }
      if (customPolicyId) {
        await supertest
          .post('/api/fleet/agent_policies/delete')
          .send({ agentPolicyId: customPolicyId })
          .set('kbn-xsrf', 'xxxx')
          .expect(200);
      }
    });

    afterEach(async () => {
      await cleanupAgentDocs(providerContext);
      try {
        await es.deleteByQuery({
          index: DEFAULT_DS_INDEX,
          ignore_unavailable: true,
          refresh: true,
          query: { match_all: {} },
        });
      } catch (_) {
        // data stream may not exist yet
      }
    });

    it('should write last_known_status and a status-change doc when an agent has no last_known_status', async () => {
      await createAgentDoc(providerContext, 'agent-status-1', policyId, '8.17.0', true, {
        // no last_known_status — task should pick this up via hasChanged:true
        local_metadata: { host: { hostname: 'host-1' } },
        namespaces: ['default'],
      });

      await new Promise((resolve) => setTimeout(resolve, TASK_INTERVAL_MS));

      // Verify last_known_status was written back to .fleet-agents
      await retry.tryForTime(30000, async () => {
        const agentRes = await es.get({ index: AGENTS_INDEX, id: 'agent-status-1' });
        const source = agentRes._source as any;
        if (!source?.last_known_status) {
          throw new Error(
            `last_known_status not set yet, got: ${JSON.stringify(source?.last_known_status)}`
          );
        }
        expect(source.last_known_status).to.be.a('string');
      });

      // Verify a status-change doc was written to the data stream
      await retry.tryForTime(30000, async () => {
        const dsRes = await es.search({
          index: DEFAULT_DS_INDEX,
          ignore_unavailable: true,
          query: { term: { 'agent.id': 'agent-status-1' } },
        });
        if (dsRes.hits.hits.length === 0) {
          throw new Error('No status-change doc found in data stream yet');
        }
        const doc = dsRes.hits.hits[0]._source as any;
        expect(doc.status).to.be.a('string');
        expect(doc['agent.id'] ?? doc.agent?.id).to.be('agent-status-1');
        expect(doc.policy_namespace).to.be('default');
        expect(doc.data_stream?.namespace).to.be('default');
      });
    });

    it('should write status-change doc with policy_namespace to default data stream when agent is enrolled under a custom namespace policy', async () => {
      await createAgentDoc(providerContext, 'agent-custom-ns', customPolicyId, '8.17.0', true, {
        local_metadata: { host: { hostname: 'host-custom' } },
        namespaces: ['default'],
      });

      await new Promise((resolve) => setTimeout(resolve, TASK_INTERVAL_MS));

      // Verify last_known_status was written back to .fleet-agents
      await retry.tryForTime(30000, async () => {
        const agentRes = await es.get({ index: AGENTS_INDEX, id: 'agent-custom-ns' });
        const source = agentRes._source as any;
        if (!source?.last_known_status) {
          throw new Error(
            `last_known_status not set yet, got: ${JSON.stringify(source?.last_known_status)}`
          );
        }
        expect(source.last_known_status).to.be.a('string');
      });

      // Verify a status-change doc was written to the default data stream with policy_namespace
      await retry.tryForTime(30000, async () => {
        const dsRes = await es.search({
          index: DEFAULT_DS_INDEX,
          ignore_unavailable: true,
          query: { term: { 'agent.id': 'agent-custom-ns' } },
        });
        if (dsRes.hits.hits.length === 0) {
          throw new Error('No status-change doc found in default data stream yet');
        }
        const doc = dsRes.hits.hits[0]._source as any;
        expect(doc.status).to.be.a('string');
        expect(doc['agent.id'] ?? doc.agent?.id).to.be('agent-custom-ns');
        expect(doc.policy_namespace).to.be('custom_namespace');
        expect(doc.data_stream?.namespace).to.be('default');
      });
    });

    it('should not duplicate status-change docs on the next run when last_known_status matches', async () => {
      await createAgentDoc(providerContext, 'agent-status-2', policyId, '8.17.0', true, {
        local_metadata: { host: { hostname: 'host-2' } },
        namespaces: ['default'],
      });

      // Wait for first task run to set last_known_status
      await new Promise((resolve) => setTimeout(resolve, TASK_INTERVAL_MS));

      let statusAfterFirstRun: string | undefined;
      await retry.tryForTime(30000, async () => {
        const agentRes = await es.get({ index: AGENTS_INDEX, id: 'agent-status-2' });
        const source = agentRes._source as any;
        if (!source?.last_known_status) throw new Error('last_known_status not set yet');
        statusAfterFirstRun = source.last_known_status;
      });

      // Count docs after first run. The task writes the status-change doc via a no-refresh bulk, so poll until it is searchable rather than trusting the first (possibly still-0) read.
      const countAfterFirst = await retry.tryForTime(30000, async () => {
        const res = await es.count({
          index: DEFAULT_DS_INDEX,
          ignore_unavailable: true,
          query: { term: { 'agent.id': 'agent-status-2' } },
        });
        if (res.count < 1) {
          throw new Error(`status-change doc not searchable yet (count=${res.count})`);
        }
        return res.count;
      });

      // Wait for the doc count to stabilise across two consecutive polls separated by
      // TASK_INTERVAL_MS. This confirms the second task run has had a chance to complete and
      // avoids the flakiness of a fixed-duration sleep on slow CI nodes.
      let prevCount = -1;
      const countAfterSecond = await retry.tryForTime(
        TASK_INTERVAL_MS * 4,
        async () => {
          const res = await es.count({
            index: DEFAULT_DS_INDEX,
            ignore_unavailable: true,
            query: { term: { 'agent.id': 'agent-status-2' } },
          });
          if (res.count !== prevCount) {
            prevCount = res.count;
            throw new Error(`Count not yet stable: ${res.count}`);
          }
          return res.count;
        },
        undefined,
        TASK_INTERVAL_MS
      );

      // No additional docs should be written since status didn't change
      expect(countAfterSecond).to.be(countAfterFirst);
      expect(statusAfterFirstRun).to.be.a('string');
    });

    it('should handle agents with no local_metadata without throwing', async () => {
      // Agent with no local_metadata — previously caused TypeError crash that deadlocked the task
      await createAgentDoc(providerContext, 'agent-no-meta', policyId, '8.17.0', true, {
        namespaces: ['default'],
        // deliberately no local_metadata.host.hostname
      });
      await createAgentDoc(providerContext, 'agent-with-meta', policyId, '8.17.0', true, {
        local_metadata: { host: { hostname: 'host-3' } },
        namespaces: ['default'],
      });

      await new Promise((resolve) => setTimeout(resolve, TASK_INTERVAL_MS));

      // Both agents should have last_known_status written (task didn't crash)
      await retry.tryForTime(30000, async () => {
        for (const agentId of ['agent-no-meta', 'agent-with-meta']) {
          const agentRes = await es.get({ index: AGENTS_INDEX, id: agentId });
          const source = agentRes._source as any;
          if (!source?.last_known_status) {
            throw new Error(`last_known_status not set on ${agentId}`);
          }
        }
      });
    });
  });
}
