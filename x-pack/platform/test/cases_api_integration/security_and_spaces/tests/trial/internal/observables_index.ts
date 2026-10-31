/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { OBSERVABLE_TYPE_IPV4 } from '@kbn/cases-plugin/common/constants';
import { OBSERVABLES_INDEX_NAME } from '@kbn/cases-plugin/server/common/constants';
import { superUser } from '../../../../common/lib/authentication/users';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  createCase,
  deleteAllCaseItems,
  addObservable,
  updateObservable,
  deleteObservable,
  bulkDeleteObservables,
  getCase,
} from '../../../../common/lib/api';

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

interface IndexedObservable {
  case_id: string;
  space_id: string;
  owner: string;
  type_key: string;
  value: string;
  description?: string;
  legacy_id?: string;
  source: string;
}

/**
 * While the case field is the source of truth, every observable write is mirrored to the cases-owned
 * observables index. These tests prove the mirror lands in a real index, created lazily on the first
 * write, with the identifiers the later read path filters on.
 */
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');

  const getIndexedObservables = async (caseId: string) => {
    await es.indices.refresh({ index: OBSERVABLES_INDEX_NAME });
    const { hits } = await es.search<IndexedObservable>({
      index: OBSERVABLES_INDEX_NAME,
      query: { term: { case_id: caseId } },
      sort: [{ created_at: 'asc' }, { value: 'asc' }],
      size: 100,
    });

    return hits.hits;
  };

  const newObservable = (value: string, description = '') => ({
    value,
    typeKey: OBSERVABLE_TYPE_IPV4.key,
    description,
  });

  describe('observables index mirror', () => {
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

    it('writes an added observable to the index with the case, space and owner it belongs to', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());

      const {
        observables: [observable],
      } = await addObservable({
        supertest,
        caseId: postedCase.id,
        params: { observable: newObservable('127.0.0.1', 'first') },
      });

      const indexed = await getIndexedObservables(postedCase.id);

      expect(indexed.length).to.be(1);
      expect(indexed[0]._source).to.eql({
        case_id: postedCase.id,
        space_id: 'default',
        owner: postedCase.owner,
        type_key: OBSERVABLE_TYPE_IPV4.key,
        value: '127.0.0.1',
        description: 'first',
        legacy_id: observable.id,
        source: 'api',
        created_at: observable.createdAt,
        updated_at: observable.updatedAt,
      });
      // The document id is deterministic and never the random id callers see.
      expect(indexed[0]._id).to.not.be(observable.id);
      expect(indexed[0]._id).to.have.length(36);
    });

    it('records the space of the case', async () => {
      const auth = { user: superUser, space: 'space1' };
      const postedCase = await createCase(supertest, getPostCaseRequest(), 200, auth);

      await addObservable({
        supertest,
        caseId: postedCase.id,
        params: { observable: newObservable('127.0.0.1') },
        auth,
      });

      const indexed = await getIndexedObservables(postedCase.id);

      expect(indexed.length).to.be(1);
      expect(indexed[0]._source?.space_id).to.be('space1');
    });

    it('keeps the index in step with the case across adds, edits and deletes', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());

      await addObservable({
        supertest,
        caseId: postedCase.id,
        params: { observable: newObservable('10.0.0.1') },
      });
      await addObservable({
        supertest,
        caseId: postedCase.id,
        params: { observable: newObservable('10.0.0.2') },
      });
      const withThree = await addObservable({
        supertest,
        caseId: postedCase.id,
        params: { observable: newObservable('10.0.0.3') },
      });
      const [first, second, third] = withThree.observables;

      // A description-only edit rewrites the same document.
      await updateObservable({
        supertest,
        caseId: postedCase.id,
        observableId: first.id as string,
        params: { observable: { value: first.value, description: 'edited' } },
      });
      let indexed = await getIndexedObservables(postedCase.id);
      expect(indexed.length).to.be(3);
      expect(
        indexed.find(({ _source }) => _source?.value === '10.0.0.1')?._source
      ).to.have.property('description', 'edited');

      // A value edit replaces the document and keeps the id callers know in legacy_id.
      await updateObservable({
        supertest,
        caseId: postedCase.id,
        observableId: second.id as string,
        params: { observable: { value: '10.0.0.22', description: '' } },
      });
      indexed = await getIndexedObservables(postedCase.id);
      expect(indexed.map(({ _source }) => _source?.value).sort()).to.eql([
        '10.0.0.1',
        '10.0.0.22',
        '10.0.0.3',
      ]);
      expect(
        indexed.find(({ _source }) => _source?.value === '10.0.0.22')?._source
      ).to.have.property('legacy_id', second.id);

      await deleteObservable({
        supertest,
        caseId: postedCase.id,
        observableId: third.id as string,
        expectedHttpCode: 204,
      });
      await bulkDeleteObservables({
        supertest,
        caseId: postedCase.id,
        observableIds: [first.id as string],
      });

      indexed = await getIndexedObservables(postedCase.id);
      const finalCase = await getCase({ supertest, caseId: postedCase.id });
      expect(indexed.map(({ _source }) => _source?.value)).to.eql(
        finalCase.observables.map(({ value }) => value)
      );
      expect(indexed.map(({ _source }) => _source?.value)).to.eql(['10.0.0.22']);
    });

    it('does not mirror an observable that the case already holds', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest());
      const params = { observable: newObservable('127.0.0.1') };

      await addObservable({ supertest, caseId: postedCase.id, params });
      await addObservable({ supertest, caseId: postedCase.id, params, expectedHttpCode: 400 });

      expect((await getIndexedObservables(postedCase.id)).length).to.be(1);
    });
  });
};
