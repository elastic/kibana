/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidV4 } from 'uuid';
import { AGENT_POLICY_INDEX, AGENTS_INDEX } from '@kbn/fleet-plugin/common/constants';

import type { FtrProviderContext } from '../../api_integration/ftr_provider_context';
import {
  POLICY_BASE_ID_BACKFILL_TASK_ID,
  TASK_MANAGER_INDEX,
  skipIfNoDockerRegistry,
  waitForPolicyBaseIdBackfill,
} from '../helpers';

interface TaskDoc {
  task: { taskType: string; params: string; enabled?: boolean; runAt: string };
}

interface SeededDoc {
  index: string;
  id: string;
  policyId: string;
}

export default function (providerContext: FtrProviderContext) {
  const { getService } = providerContext;
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');

  describe('policy_base_id backfill', () => {
    skipIfNoDockerRegistry(providerContext);

    let agentPolicyId: string;
    let docs: SeededDoc[];
    let taskTemplate: TaskDoc;

    const fleetSetup = () => supertest.post(`/api/fleet/setup`).set('kbn-xsrf', 'xxxx').expect(200);

    const waitForTaskRemoved = () => waitForPolicyBaseIdBackfill(providerContext);

    const getTaskDoc = () =>
      es.get<TaskDoc>({ index: TASK_MANAGER_INDEX, id: POLICY_BASE_ID_BACKFILL_TASK_ID });

    // Task Manager does not claim disabled tasks, and the setup does not schedule the task
    // again while it exists, so that the backfill only runs once the task is released
    const holdTask = async () => {
      await waitForTaskRemoved();
      const now = new Date().toISOString();
      await es.index({
        index: TASK_MANAGER_INDEX,
        id: POLICY_BASE_ID_BACKFILL_TASK_ID,
        refresh: true,
        document: {
          ...taskTemplate,
          updated_at: now,
          task: {
            ...taskTemplate.task,
            enabled: false,
            status: 'idle',
            attempts: 0,
            runAt: now,
            scheduledAt: now,
            retryAt: null,
            startedAt: null,
            ownerId: null,
          },
        },
      });
      return (await getTaskDoc())._version;
    };

    const releaseTask = () =>
      es.update({
        index: TASK_MANAGER_INDEX,
        id: POLICY_BASE_ID_BACKFILL_TASK_ID,
        refresh: true,
        doc: { task: { enabled: true, runAt: new Date().toISOString() } },
      });

    const getBackfillTaskIds = async () => {
      await es.indices.refresh({ index: TASK_MANAGER_INDEX });
      const res = await es.search<TaskDoc>({
        index: TASK_MANAGER_INDEX,
        size: 100,
        query: { term: { 'task.taskType': 'fleet:setup' } },
      });
      return res.hits.hits
        .filter((hit) => JSON.parse(hit._source!.task.params).type === 'backfillPolicyBaseId')
        .map((hit) => hit._id);
    };

    const getDocs = async (seeded: SeededDoc[] = docs) => {
      const res = await es.mget<{ policy_id: unknown; policy_base_id?: string }>({
        docs: seeded.map(({ index, id }) => ({ _index: index, _id: id })),
      });
      return res.docs.map((doc) => {
        if (!('found' in doc) || !doc.found) {
          throw new Error(`${doc._index}/${doc._id} not found`);
        }
        return { id: doc._id, version: doc._version!, policyBaseId: doc._source?.policy_base_id };
      });
    };

    const expectBackfilled = async (seeded: SeededDoc[] = docs) => {
      for (const doc of await getDocs(seeded)) {
        expect(doc.policyBaseId).to.be(agentPolicyId);
      }
    };

    const removePolicyBaseId = async (seeded: SeededDoc[] = docs) => {
      for (const index of [AGENTS_INDEX, AGENT_POLICY_INDEX]) {
        const ids = seeded.filter((doc) => doc.index === index).map(({ id }) => id);
        if (ids.length > 0) {
          await es.updateByQuery({
            index,
            refresh: true,
            conflicts: 'proceed',
            query: { ids: { values: ids } },
            script: { source: "ctx._source.remove('policy_base_id')" },
          });
        }
      }
    };

    const indexAgent = (id: string, policyId: unknown) =>
      es.index({
        index: AGENTS_INDEX,
        id,
        refresh: 'wait_for',
        document: {
          id,
          type: 'PERMANENT',
          // Inactive, so that the other Fleet tasks leave it alone
          active: false,
          enrolled_at: new Date().toISOString(),
          policy_id: policyId,
          policy_revision_idx: 1,
          agent: { id, version: '9.4.0' },
        },
      });

    before(async () => {
      // Creates the Fleet settings, which an earlier suite may have deleted: a policy created
      // before them is stored with another saved object type than the one Fleet uses after
      // The task document scheduled by the setup, to hold the task in the tests. The setup is
      // retried in case the task already ran.
      taskTemplate = await retry.try(async () => {
        await fleetSetup();
        return (await getTaskDoc())._source!;
      });
      const { body } = await supertest
        .post(`/api/fleet/agent_policies`)
        .set('kbn-xsrf', 'xxxx')
        .send({ name: `Backfill test ${uuidV4()}`, namespace: 'default' })
        .expect(200);
      agentPolicyId = body.item.id;

      const policyIds = [agentPolicyId, `${agentPolicyId}#9.4`, `${agentPolicyId}#sentinel`];
      docs = policyIds.flatMap((policyId) => [
        { index: AGENTS_INDEX, id: `backfill-agent-${uuidV4()}`, policyId },
        { index: AGENT_POLICY_INDEX, id: `backfill-policy-${uuidV4()}`, policyId },
      ]);

      // A setup task scheduled by another test must not run while the documents are seeded
      await waitForTaskRemoved();
      for (const { index, id, policyId } of docs) {
        if (index === AGENTS_INDEX) {
          await indexAgent(id, policyId);
        } else {
          await es.index({
            index,
            id,
            refresh: 'wait_for',
            document: {
              '@timestamp': new Date().toISOString(),
              policy_id: policyId,
              revision_idx: 1,
              coordinator_idx: 0,
              data: { id: policyId, revision: 1 },
            },
          });
        }
      }
    });

    after(async () => {
      await es.deleteByQuery({
        index: AGENTS_INDEX,
        refresh: true,
        conflicts: 'proceed',
        query: { ids: { values: docs.filter((d) => d.index === AGENTS_INDEX).map((d) => d.id) } },
      });
      // Also deletes the `.fleet-policies` documents of the policy and its variants
      await supertest
        .post(`/api/fleet/agent_policies/delete`)
        .set('kbn-xsrf', 'xxxx')
        .send({ agentPolicyId })
        .expect(200);
    });

    it('backfills in the setup task, after the setup response', async () => {
      await holdTask();

      const { body } = await fleetSetup();
      expect(body.nonFatalErrors ?? []).to.eql([]);
      // The setup does not backfill itself
      for (const doc of await getDocs()) {
        expect(doc.policyBaseId).to.be(undefined);
      }

      await releaseTask();
      await waitForTaskRemoved();
      // The version suffix and the sentinel are stripped
      await expectBackfilled();
    });

    it('does not update anything on the next setup', async () => {
      const versions = await getDocs();

      await fleetSetup();
      await waitForTaskRemoved();

      expect(await getDocs()).to.eql(versions);
    });

    it('backfills only the documents left without policy_base_id', async () => {
      const [agent] = docs;
      const versions = await getDocs();

      await removePolicyBaseId([agent]);
      await fleetSetup();
      await waitForTaskRemoved();

      await expectBackfilled();
      const after = await getDocs();
      // removed, then backfilled
      expect(after[0].version).to.be(versions[0].version + 2);
      expect(after.slice(1)).to.eql(versions.slice(1));
    });

    it('does not leave the task failed when the backfill of an index fails', async () => {
      // The backfill script reads policy_id as a string, so that it fails on this document
      const failingAgent = { index: AGENTS_INDEX, id: `backfill-agent-${uuidV4()}`, policyId: '' };
      await indexAgent(failingAgent.id, 12345);
      await removePolicyBaseId();
      const policyDocs = docs.filter(({ index }) => index === AGENT_POLICY_INDEX);

      try {
        await fleetSetup();
        await waitForTaskRemoved();

        // The other index is backfilled after the failed one
        await expectBackfilled(policyDocs);
        const agentDocs = await getDocs(docs.filter(({ index }) => index === AGENTS_INDEX));
        expect(agentDocs.some((doc) => doc.policyBaseId === undefined)).to.be(true);
      } finally {
        await es.delete({ index: AGENTS_INDEX, id: failingAgent.id, refresh: true });
      }

      // The next setup schedules the task again, which completes
      await fleetSetup();
      await waitForTaskRemoved();
      await expectBackfilled();
    });

    it('runs the backfill once with concurrent setups', async () => {
      await removePolicyBaseId();
      const versions = await getDocs();
      const taskVersion = await holdTask();

      await Promise.all(Array.from({ length: 5 }, () => fleetSetup()));
      // The setups neither backfill nor schedule another task
      expect(await getBackfillTaskIds()).to.eql([POLICY_BASE_ID_BACKFILL_TASK_ID]);
      expect((await getTaskDoc())._version).to.be(taskVersion);
      for (const doc of await getDocs()) {
        expect(doc.policyBaseId).to.be(undefined);
      }

      await releaseTask();
      await waitForTaskRemoved();

      await expectBackfilled();
      expect((await getDocs()).map(({ version }) => version)).to.eql(
        versions.map(({ version }) => version + 1)
      );
    });
  });
}
