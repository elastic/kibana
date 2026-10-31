/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import { OBSERVABLE_TYPE_IPV4 } from '@kbn/cases-plugin/common/constants';
import { OBSERVABLES_INDEX_NAME } from '@kbn/cases-plugin/server/common/constants';
import {
  CASES_OBSERVABLES_SYNC_TASK_ID,
  OBSERVABLES_SYNC_PASS_VERSION,
} from '@kbn/cases-plugin/server/tasks/observables_sync/constants';
import { superUser } from '../../../../common/lib/authentication/users';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import { createCase, deleteAllCaseItems, addObservable, getCase } from '../../../../common/lib/api';

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

const TASK_MANAGER_INDEX = '.kibana_task_manager';
/** Task Manager can be slow to claim the task while Kibana is still starting up. */
const WAIT_TIMEOUT_MS = 90 * 1000;
const TASK_DOCUMENT_ID = `task:${CASES_OBSERVABLES_SYNC_TASK_ID}`;

interface IndexedObservable {
  case_id: string;
  space_id: string;
  owner: string;
  type_key: string;
  value: string;
  legacy_id?: string;
  source: string;
}

/**
 * The background sync copies observables that exist only on the case into the observables index and
 * removes what no longer belongs there. These tests seed the state an upgrade leaves behind by writing
 * the observables straight into the case saved object, which bypasses the dual write.
 */
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const retry = getService('retry');

  const space1 = { user: superUser, space: 'space1' };

  // Cases are multi-namespace isolated, so the raw document id has no space prefix.
  const rawCaseId = (caseId: string) => `cases:${caseId}`;

  const seedLegacyObservables = async ({
    caseId,
    values,
    pending = false,
  }: {
    caseId: string;
    values: string[];
    pending?: boolean;
  }) => {
    const observables = values.map((value, index) => ({
      id: `legacy-${caseId}-${index}`,
      typeKey: OBSERVABLE_TYPE_IPV4.key,
      value,
      description: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: null,
    }));

    await es.update({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      id: rawCaseId(caseId),
      doc: {
        cases: {
          observables,
          total_observables: observables.length,
          ...(pending ? { observables_sync_pending: true } : {}),
        },
      },
      refresh: true,
    });

    return observables;
  };

  const getIndexedObservables = async (caseId: string) => {
    await es.indices.refresh({ index: OBSERVABLES_INDEX_NAME }, { ignore: [404] });
    const { hits } = await es.search<IndexedObservable>({
      index: OBSERVABLES_INDEX_NAME,
      ignore_unavailable: true,
      query: { term: { case_id: caseId } },
      sort: [{ value: 'asc' }],
      size: 100,
    });

    return hits.hits;
  };

  const getRawCase = async (caseId: string) =>
    es.get<{ cases: { observables_sync_pending?: boolean } }>({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      id: rawCaseId(caseId),
    });

  const getTaskState = async (): Promise<{ completedPassVersion?: number }> => {
    const document = await es.get<{ task: { state: string } }>({
      index: TASK_MANAGER_INDEX,
      id: TASK_DOCUMENT_ID,
    });
    return JSON.parse(document._source?.task.state ?? '{}');
  };

  /**
   * The first pass finishes on an empty deployment as soon as Kibana starts, so the state is reset
   * to what an upgrade finds: no pass recorded yet. The reset only applies while the task is idle,
   * because a run in flight would write its own state back over it. The task is then run until the
   * pass completes.
   */
  const runFullPass = async () => {
    await retry.waitForWithTimeout(
      'the observables sync task to be idle and its state reset',
      WAIT_TIMEOUT_MS,
      async () => {
        const { updated } = await es.updateByQuery({
          index: TASK_MANAGER_INDEX,
          query: {
            bool: {
              filter: [
                { ids: { values: [TASK_DOCUMENT_ID] } },
                { term: { 'task.status': 'idle' } },
              ],
            },
          },
          script: { source: "ctx._source.task.state = '{}'", lang: 'painless' },
          refresh: true,
          conflicts: 'proceed',
        });
        return updated === 1;
      }
    );

    await retry.waitForWithTimeout(
      'the observables sync pass to complete',
      WAIT_TIMEOUT_MS,
      async () => {
        await supertest
          .post('/api/cases_fixture/observables_sync/run_soon')
          .set('kbn-xsrf', 'true');
        const { completedPassVersion } = await getTaskState();
        return completedPassVersion === OBSERVABLES_SYNC_PASS_VERSION;
      }
    );
  };

  describe('observables sync task', () => {
    before(async () => {
      // The task runs its first pass, on an empty deployment, as soon as Kibana starts.
      await retry.waitForWithTimeout(
        'the first observables sync pass to complete',
        WAIT_TIMEOUT_MS,
        async () => (await getTaskState()).completedPassVersion === OBSERVABLES_SYNC_PASS_VERSION
      );
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await es.deleteByQuery({
        index: OBSERVABLES_INDEX_NAME,
        query: { match_all: {} },
        refresh: true,
        conflicts: 'proceed',
        ignore_unavailable: true,
      });
    });

    it('copies observables that exist only on the case into the index, in every space', async () => {
      const defaultCase = await createCase(supertest, getPostCaseRequest());
      const spaceCase = await createCase(supertest, getPostCaseRequest(), 200, space1);
      const emptyCase = await createCase(supertest, getPostCaseRequest());
      const legacy = await seedLegacyObservables({
        caseId: defaultCase.id,
        values: ['10.0.0.1', '10.0.0.2'],
        pending: true,
      });
      const spaceLegacy = await seedLegacyObservables({
        caseId: spaceCase.id,
        values: ['10.1.0.1'],
      });

      await runFullPass();

      const indexed = await getIndexedObservables(defaultCase.id);
      expect(indexed.map(({ _source }) => _source?.value)).to.eql(['10.0.0.1', '10.0.0.2']);
      expect(indexed.map(({ _source }) => _source?.legacy_id)).to.eql(legacy.map(({ id }) => id));
      indexed.forEach(({ _source, _id }) => {
        expect(_source?.source).to.be('migration');
        expect(_source?.space_id).to.be('default');
        expect(_source?.owner).to.be(defaultCase.owner);
        expect(_id).to.have.length(36);
      });

      const spaceIndexed = await getIndexedObservables(spaceCase.id);
      expect(spaceIndexed.length).to.be(1);
      expect(spaceIndexed[0]._source?.space_id).to.be('space1');
      expect(spaceIndexed[0]._source?.legacy_id).to.be(spaceLegacy[0].id);

      expect((await getIndexedObservables(emptyCase.id)).length).to.be(0);
    });

    it('clears the pending flag and leaves the case, and what the API returns, unchanged', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      const legacy = await seedLegacyObservables({
        caseId: postedCase.id,
        values: ['10.0.0.1'],
        pending: true,
      });

      await runFullPass();

      expect((await getRawCase(postedCase.id))._source?.cases.observables_sync_pending).to.be(
        false
      );
      const { observables, total_observables: total } = await getCase({
        supertest,
        caseId: postedCase.id,
      });
      expect(observables.map(({ id }) => id)).to.eql(legacy.map(({ id }) => id));
      expect(total).to.be(1);
    });

    it('does not duplicate documents when the pass runs again', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      await seedLegacyObservables({ caseId: postedCase.id, values: ['10.0.0.1', '10.0.0.2'] });

      await runFullPass();
      await runFullPass();

      expect((await getIndexedObservables(postedCase.id)).length).to.be(2);
    });

    it('removes index documents that the case does not have', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      await seedLegacyObservables({ caseId: postedCase.id, values: ['10.0.0.1'] });
      await es.index({
        index: OBSERVABLES_INDEX_NAME,
        id: 'stray-document',
        document: {
          case_id: postedCase.id,
          space_id: 'default',
          owner: postedCase.owner,
          type_key: OBSERVABLE_TYPE_IPV4.key,
          value: '10.9.9.9',
          source: 'api',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        },
        refresh: true,
      });

      await runFullPass();

      const indexed = await getIndexedObservables(postedCase.id);
      expect(indexed.map(({ _source }) => _source?.value)).to.eql(['10.0.0.1']);
    });

    it('removes the documents of a case that was deleted along with its space', async () => {
      const spaceCase = await createCase(supertest, getPostCaseRequest(), 200, space1);
      await addObservable({
        supertest,
        caseId: spaceCase.id,
        params: {
          observable: { value: '10.1.0.1', typeKey: OBSERVABLE_TYPE_IPV4.key, description: '' },
        },
        auth: space1,
      });
      expect((await getIndexedObservables(spaceCase.id)).length).to.be(1);

      // Deleting a space removes its saved objects without running the cases delete.
      await es.delete({
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        id: rawCaseId(spaceCase.id),
        refresh: true,
      });

      await runFullPass();

      expect((await getIndexedObservables(spaceCase.id)).length).to.be(0);
    });

    it('removes the documents of a case whose observables were all deleted', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      await addObservable({
        supertest,
        caseId: postedCase.id,
        params: {
          observable: { value: '10.0.0.1', typeKey: OBSERVABLE_TYPE_IPV4.key, description: '' },
        },
      });
      await es.update({
        index: ALERTING_CASES_SAVED_OBJECT_INDEX,
        id: rawCaseId(postedCase.id),
        doc: { cases: { observables: [], total_observables: 0 } },
        refresh: true,
      });
      expect((await getIndexedObservables(postedCase.id)).length).to.be(1);

      await runFullPass();

      expect((await getIndexedObservables(postedCase.id)).length).to.be(0);
    });
  });
};
