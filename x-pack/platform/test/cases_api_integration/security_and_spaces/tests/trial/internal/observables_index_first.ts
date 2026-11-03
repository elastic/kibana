/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';

import { MAX_OBSERVABLES_PER_CASE, OBSERVABLE_TYPE_IPV4 } from '@kbn/cases-plugin/common/constants';
import { getCaseCreateObservableUrl } from '@kbn/cases-plugin/common/api';
import { OBSERVABLES_INDEX_NAME } from '@kbn/cases-plugin/server/common/constants';
import type { Case } from '@kbn/cases-plugin/common/types/domain';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  addObservable,
  bulkDeleteObservables,
  createCase,
  deleteAllCaseItems,
  deleteObservable,
  findObservables,
  getCase,
  updateObservable,
} from '../../../../common/lib/api';

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

/** Reads come from the index once the sync pass of the release has completed, which can take a minute. */
const WAIT_TIMEOUT_MS = 120 * 1000;

interface IndexedObservable {
  case_id: string;
  type_key: string;
  value: string;
  legacy_id?: string;
}

/**
 * Once the sync pass has completed, the list of observables is read from the observables index. Every
 * observable write must then leave the index holding exactly what the case holds, also when writes race
 * for the same case, and a write the index refuses must not reach the case.
 */
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const retry = getService('retry');

  const observable = (value: string, description = '') => ({
    typeKey: OBSERVABLE_TYPE_IPV4.key,
    value,
    description,
  });

  const getIndexedObservables = async (caseId: string) => {
    await es.indices.refresh({ index: OBSERVABLES_INDEX_NAME });
    const { hits } = await es.search<IndexedObservable>({
      index: OBSERVABLES_INDEX_NAME,
      query: { term: { case_id: caseId } },
      size: 1000,
    });
    return hits.hits.flatMap(({ _source }) => (_source ? [_source] : []));
  };

  const byId = (a: { id?: string }, b: { id?: string }) => (a.id ?? '').localeCompare(b.id ?? '');

  /** The ids, type keys and values of the index must be those of the case, one document each. */
  const expectIndexToMatchCase = async (caseId: string): Promise<Case> => {
    const theCase = await getCase({ supertest, caseId });
    const indexed = await getIndexedObservables(caseId);

    expect(
      indexed
        .map(({ legacy_id: id, type_key: typeKey, value }) => ({ id, typeKey, value }))
        .sort(byId)
    ).to.eql(
      theCase.observables.map(({ id, typeKey, value }) => ({ id, typeKey, value })).sort(byId)
    );
    return theCase;
  };

  /** Adds an observable without asserting the response, for requests that race each other. */
  const postObservable = (caseId: string, value: string) =>
    supertest
      .post(getCaseCreateObservableUrl(caseId))
      .set('kbn-xsrf', 'true')
      .set('x-elastic-internal-origin', 'foo')
      .send({ observable: observable(value) });

  const getRawCase = async (caseId: string) =>
    es.get<{ cases: { observables_sync_pending?: boolean } }>({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      id: `cases:${caseId}`,
    });

  const clearObservablesIndex = () =>
    es.deleteByQuery({
      index: OBSERVABLES_INDEX_NAME,
      query: { match_all: {} },
      refresh: true,
      conflicts: 'proceed',
      ignore_unavailable: true,
    });

  describe('observable writes once reads come from the index', () => {
    before(async function () {
      // Leaves room for the wait below, which has to outlast the minute a node takes to notice the pass.
      this.timeout(WAIT_TIMEOUT_MS + 60 * 1000);

      // A document that only the index holds shows that reads come from the index.
      const probe = await createCase(supertest, getPostCaseRequest());
      await addObservable({
        supertest,
        caseId: probe.id,
        params: { observable: observable('192.0.2.1') },
      });
      await es.index({
        index: OBSERVABLES_INDEX_NAME,
        id: uuidv4(),
        document: {
          case_id: probe.id,
          space_id: 'default',
          owner: probe.owner,
          type_key: OBSERVABLE_TYPE_IPV4.key,
          value: '192.0.2.2',
          source: 'api',
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: '2020-01-01T00:00:00.000Z',
        },
        refresh: true,
      });

      await retry.waitForWithTimeout(
        'observables to be read from the index',
        WAIT_TIMEOUT_MS,
        async () => (await findObservables({ supertest, caseId: probe.id })).total === 2
      );

      await deleteAllCaseItems(es);
      await clearObservablesIndex();
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await clearObservablesIndex();
    });

    it('keeps the index equal to the case through adds, edits and deletes', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      const caseId = postedCase.id;

      for (const value of ['10.0.0.1', '10.0.0.2', '10.0.0.3', '10.0.0.4']) {
        await addObservable({ supertest, caseId, params: { observable: observable(value) } });
      }
      const {
        observables: [first, second, third, fourth],
      } = await expectIndexToMatchCase(caseId);

      await updateObservable({
        supertest,
        caseId,
        observableId: first.id,
        params: { observable: { value: first.value, description: 'a new description' } },
      });
      await expectIndexToMatchCase(caseId);

      await updateObservable({
        supertest,
        caseId,
        observableId: second.id,
        params: { observable: { value: '10.0.0.20', description: null } },
      });
      await expectIndexToMatchCase(caseId);

      await deleteObservable({ supertest, caseId, observableId: third.id, expectedHttpCode: 204 });
      await expectIndexToMatchCase(caseId);

      await bulkDeleteObservables({ supertest, caseId, observableIds: [fourth.id] });
      const finalCase = await expectIndexToMatchCase(caseId);

      expect(finalCase.observables.map(({ value }) => value).sort()).to.eql([
        '10.0.0.1',
        '10.0.0.20',
      ]);
      expect((await findObservables({ supertest, caseId })).total).to.be(2);
    });

    // Two writers that add the same observable at once compute the same document. Whichever loses the
    // race for the case version must not leave the document with its own id, or the list would return
    // an id the case does not know.
    it('keeps one document with the id the case holds when the same observable is added twice at once', async () => {
      for (let round = 0; round < 5; round++) {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const value = `10.1.0.${round}`;

        const responses = await Promise.all([
          postObservable(postedCase.id, value),
          postObservable(postedCase.id, value),
        ]);

        expect(responses.map(({ status }) => status).sort()).to.eql([200, 400]);
        const theCase = await expectIndexToMatchCase(postedCase.id);
        expect(theCase.observables.length).to.be(1);
      }
    });

    // The first of two racing adds takes the last place under the cap. If the other one wrote its
    // document before losing the race, that document must be gone before the request returns, because
    // the list reads the index.
    it('holds exactly the cap in both stores when two adds race for the last place', async function () {
      this.timeout(120 * 1000);
      const postedCase = await createCase(supertest, getPostCaseRequest());

      for (let index = 0; index < MAX_OBSERVABLES_PER_CASE - 1; index++) {
        await addObservable({
          supertest,
          caseId: postedCase.id,
          params: { observable: observable(`10.2.0.${index}`) },
        });
      }

      const responses = await Promise.all([
        postObservable(postedCase.id, '10.3.0.1'),
        postObservable(postedCase.id, '10.3.0.2'),
      ]);

      expect(responses.map(({ status }) => status).sort()).to.eql([200, 400]);
      const theCase = await expectIndexToMatchCase(postedCase.id);
      expect(theCase.observables.length).to.be(MAX_OBSERVABLES_PER_CASE);
      expect(theCase.total_observables).to.be(MAX_OBSERVABLES_PER_CASE);
    });

    describe('when the index refuses writes', () => {
      const setWriteBlock = (blocked: boolean) =>
        es.indices.putSettings({
          index: OBSERVABLES_INDEX_NAME,
          settings: { 'index.blocks.write': blocked },
        });

      afterEach(async () => {
        await setWriteBlock(false);
      });

      it('rejects the add, leaves the case unchanged and flags it for the sync', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        await addObservable({
          supertest,
          caseId: postedCase.id,
          params: { observable: observable('10.4.0.1') },
        });
        await setWriteBlock(true);

        const response = await postObservable(postedCase.id, '10.4.0.2');

        expect(response.status).to.be(400);
        const theCase = await getCase({ supertest, caseId: postedCase.id });
        expect(theCase.observables.map(({ value }) => value)).to.eql(['10.4.0.1']);
        expect((await getRawCase(postedCase.id))._source?.cases.observables_sync_pending).to.be(
          true
        );
        const indexed = await getIndexedObservables(postedCase.id);
        expect(indexed.map(({ value }) => value)).to.eql(['10.4.0.1']);
      });

      it('rejects the delete and keeps the observable on the case and in the index', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const {
          observables: [added],
        } = await addObservable({
          supertest,
          caseId: postedCase.id,
          params: { observable: observable('10.5.0.1') },
        });
        await setWriteBlock(true);

        await deleteObservable({
          supertest,
          caseId: postedCase.id,
          observableId: added.id,
          expectedHttpCode: 400,
        });

        await setWriteBlock(false);
        await expectIndexToMatchCase(postedCase.id);
        const theCase = await getCase({ supertest, caseId: postedCase.id });
        expect(theCase.observables.map(({ id }) => id)).to.eql([added.id]);
      });
    });
  });
};
