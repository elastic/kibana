/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import expect from '@kbn/expect';

import {
  MAX_OBSERVABLES_PER_PAGE,
  OBSERVABLE_TYPE_DOMAIN,
  OBSERVABLE_TYPE_IPV4,
} from '@kbn/cases-plugin/common/constants';
import { OBSERVABLES_INDEX_NAME } from '@kbn/cases-plugin/server/common/constants';
import type { Observable } from '@kbn/cases-plugin/common/types/domain';
import type { User } from '../../../../common/lib/authentication/types';
import {
  noKibanaPrivileges,
  obsOnly,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  addObservable,
  createCase,
  deleteAllCaseItems,
  findObservables,
  getCase,
} from '../../../../common/lib/api';

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

/** Reads come from the index once the sync pass of the release has completed, which can take a minute. */
const WAIT_TIMEOUT_MS = 120 * 1000;

interface SeededDocument {
  caseId: string;
  value: string;
  typeKey?: string;
  createdAt?: string;
  spaceId?: string;
  owner?: string;
}

/**
 * The observables tab lists the observables of a case a page at a time, read from the observables index
 * once it is complete. The index is the source of truth from then on, so these tests seed documents that
 * exist only in the index, which is how they tell the two stores apart.
 */
export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');

  const space1 = { user: superUser, space: 'space1' };

  const addObservableTo = async ({
    caseId,
    value,
    typeKey = OBSERVABLE_TYPE_IPV4.key,
    auth = { user: superUser, space: null },
  }: {
    caseId: string;
    value: string;
    typeKey?: string;
    auth?: { user: User; space: string | null };
  }) =>
    addObservable({
      supertest,
      caseId,
      params: { observable: { value, typeKey, description: '' } },
      auth,
    });

  const seedIndexOnlyDocument = async ({
    caseId,
    value,
    typeKey = OBSERVABLE_TYPE_IPV4.key,
    createdAt = '2020-01-01T00:00:00.000Z',
    spaceId = 'default',
    owner = getPostCaseRequest().owner,
  }: SeededDocument) => {
    const id = uuidv4();
    await es.index({
      index: OBSERVABLES_INDEX_NAME,
      id,
      document: {
        case_id: caseId,
        space_id: spaceId,
        owner,
        type_key: typeKey,
        value,
        source: 'api',
        created_at: createdAt,
        updated_at: createdAt,
      },
      refresh: true,
    });
    return id;
  };

  const values = (observables: Observable[]) => observables.map(({ value }) => value);

  /** Follows the cursors from the first page, returning every page. */
  const getAllPages = async ({
    caseId,
    params,
  }: {
    caseId: string;
    params: Record<string, unknown>;
  }) => {
    const pages = [await findObservables({ supertest, caseId, params })];
    while (pages[pages.length - 1].cursor) {
      pages.push(
        await findObservables({
          supertest,
          caseId,
          params: { ...params, cursor: pages[pages.length - 1].cursor },
        })
      );
    }
    return pages;
  };

  describe('find observables', () => {
    before(async function () {
      // Leaves room for the wait below, which has to outlast the minute a node takes to notice the pass.
      this.timeout(WAIT_TIMEOUT_MS + 60 * 1000);

      // The first write creates the observables index. A document that only the index holds shows that
      // reads come from the index, which the node starts doing a minute after the sync pass completed.
      const probe = await createCase(supertest, getPostCaseRequest());
      await addObservableTo({ caseId: probe.id, value: '192.0.2.1' });
      await seedIndexOnlyDocument({ caseId: probe.id, value: '192.0.2.2' });

      let lastObservation = 'no response yet';
      await retry
        .waitForWithTimeout('observables to be read from the index', WAIT_TIMEOUT_MS, async () => {
          try {
            const { total } = await findObservables({ supertest, caseId: probe.id });
            lastObservation = `total ${total}`;
            return total === 2;
          } catch (error) {
            lastObservation = `error ${error.message}`;
            return false;
          }
        })
        .catch(async (error) => {
          const { hits } = await es.search({
            index: OBSERVABLES_INDEX_NAME,
            ignore_unavailable: true,
            query: { term: { case_id: probe.id } },
          });
          throw new Error(
            `${error.message}. Last observation: ${lastObservation}. Index holds: ${JSON.stringify(
              hits.hits.map(({ _index, _id, _source }) => ({ _index, _id, _source }))
            )}. Case owner: ${probe.owner}`
          );
        });
      await deleteAllCaseItems(es);
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('reading', () => {
      let caseId: string;
      let caseObservables: Observable[];

      beforeEach(async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        caseId = postedCase.id;

        await addObservableTo({ caseId, value: '10.0.0.1' });
        await addObservableTo({ caseId, value: '10.0.0.2' });
        await addObservableTo({ caseId, value: '10.0.0.3' });
        await addObservableTo({
          caseId,
          value: 'a.example.com',
          typeKey: OBSERVABLE_TYPE_DOMAIN.key,
        });
        await addObservableTo({
          caseId,
          value: 'b.example.com',
          typeKey: OBSERVABLE_TYPE_DOMAIN.key,
        });
        await seedIndexOnlyDocument({ caseId, value: '10.0.0.99' });

        caseObservables = (await getCase({ supertest, caseId })).observables;
      });

      it('lists the observables of the index with the ids the case shows', async () => {
        const page = await findObservables({ supertest, caseId });

        expect(page.total).to.be(6);
        expect(page.cursor).to.be(undefined);
        // The seeded document is only in the index, so the list does not come from the case field.
        expect(values(page.observables).sort()).to.eql([
          '10.0.0.1',
          '10.0.0.2',
          '10.0.0.3',
          '10.0.0.99',
          'a.example.com',
          'b.example.com',
        ]);
        caseObservables.forEach(({ id, value }) => {
          expect(page.observables.find((observable) => observable.value === value)?.id).to.be(id);
        });
      });

      it('lists the oldest first by default', async () => {
        const page = await findObservables({ supertest, caseId });

        expect(page.observables[0].value).to.be('10.0.0.99');
      });

      it('returns every observable exactly once across pages, with no cursor on the last', async () => {
        const pages = await getAllPages({
          caseId,
          params: { perPage: 2, sortField: 'value', sortOrder: 'asc' },
        });

        expect(pages.map(({ observables }) => observables.length)).to.eql([2, 2, 2]);
        expect(pages.map(({ cursor }) => cursor !== undefined)).to.eql([true, true, false]);
        expect(pages.every(({ total }) => total === 6)).to.be(true);
        expect(pages.flatMap(({ observables }) => values(observables))).to.eql([
          '10.0.0.1',
          '10.0.0.2',
          '10.0.0.3',
          '10.0.0.99',
          'a.example.com',
          'b.example.com',
        ]);
      });

      it('sorts in either order and by type', async () => {
        const descending = await findObservables({
          supertest,
          caseId,
          params: { sortField: 'value', sortOrder: 'desc' },
        });
        expect(values(descending.observables)[0]).to.be('b.example.com');

        const byType = await findObservables({
          supertest,
          caseId,
          params: { sortField: 'type', sortOrder: 'asc' },
        });
        const typeKeys = byType.observables.map(({ typeKey }) => typeKey);
        expect(typeKeys).to.eql([...typeKeys].sort());
      });

      it('filters by type and counts only what matches', async () => {
        const page = await findObservables({
          supertest,
          caseId,
          params: { typeKeys: [OBSERVABLE_TYPE_DOMAIN.key], sortField: 'value' },
        });

        expect(page.total).to.be(2);
        expect(values(page.observables)).to.eql(['a.example.com', 'b.example.com']);
      });

      it('keeps every earlier observable exactly once when one is added between pages', async () => {
        const first = await findObservables({ supertest, caseId, params: { perPage: 3 } });
        await addObservableTo({ caseId, value: '10.0.0.200' });
        const second = await findObservables({
          supertest,
          caseId,
          params: { perPage: 3, cursor: first.cursor },
        });

        const seen = [...values(first.observables), ...values(second.observables)];
        expect(new Set(seen).size).to.be(seen.length);
        expect(seen).to.contain('10.0.0.1');
        expect(seen).to.contain('b.example.com');
      });

      it('does not return documents of the same case id in another space or of another owner', async () => {
        await seedIndexOnlyDocument({ caseId, value: '10.1.1.1', spaceId: 'space2' });
        await seedIndexOnlyDocument({ caseId, value: '10.2.2.2', owner: 'observability' });

        const page = await findObservables({ supertest, caseId });

        expect(page.total).to.be(6);
        expect(values(page.observables)).not.to.contain('10.1.1.1');
        expect(values(page.observables)).not.to.contain('10.2.2.2');
      });

      it('lists nothing for a case without observables', async () => {
        const emptyCase = await createCase(supertest, getPostCaseRequest());

        const page = await findObservables({ supertest, caseId: emptyCase.id });

        expect(page).to.eql({ observables: [], total: 0 });
      });

      it('does not change the case', async () => {
        const before = await getCase({ supertest, caseId });

        await findObservables({ supertest, caseId });

        const after = await getCase({ supertest, caseId });
        expect(after.version).to.be(before.version);
        expect(after.observables).to.eql(caseObservables);
      });
    });

    describe('invalid requests', () => {
      let caseId: string;

      beforeEach(async () => {
        caseId = (await createCase(supertest, getPostCaseRequest())).id;
        await addObservableTo({ caseId, value: '10.0.0.1' });
        await addObservableTo({ caseId, value: '10.0.0.2' });
      });

      it('rejects a page size above the maximum', async () => {
        await findObservables({
          supertest,
          caseId,
          params: { perPage: MAX_OBSERVABLES_PER_PAGE + 1 },
          expectedHttpCode: 400,
        });
      });

      it('rejects an unknown sort field and an unknown attribute', async () => {
        await findObservables({
          supertest,
          caseId,
          params: { sortField: 'description' },
          expectedHttpCode: 400,
        });
        await findObservables({ supertest, caseId, params: { page: 2 }, expectedHttpCode: 400 });
      });

      it('rejects a cursor that is not one', async () => {
        await findObservables({
          supertest,
          caseId,
          params: { cursor: 'not-a-cursor' },
          expectedHttpCode: 400,
        });
      });

      it('rejects a well-formed cursor with sort values that do not fit the sort', async () => {
        const cursor = Buffer.from(
          JSON.stringify({
            source: 'index',
            sortField: 'created',
            sortOrder: 'asc',
            searchAfter: ['not-enough'],
          })
        ).toString('base64url');

        await findObservables({ supertest, caseId, params: { cursor }, expectedHttpCode: 400 });
      });

      it('rejects a cursor made for another sort order, which would skip or repeat observables', async () => {
        const first = await findObservables({
          supertest,
          caseId,
          params: { perPage: 1, sortField: 'value', sortOrder: 'asc' },
        });
        expect(first.cursor).not.to.be(undefined);

        await findObservables({
          supertest,
          caseId,
          params: { perPage: 1, sortField: 'value', sortOrder: 'desc', cursor: first.cursor },
          expectedHttpCode: 400,
        });
      });

      it('answers 404 for a case that does not exist', async () => {
        await findObservables({ supertest, caseId: 'does-not-exist', expectedHttpCode: 404 });
      });
    });

    describe('permissions', () => {
      let caseId: string;

      beforeEach(async () => {
        caseId = (await createCase(supertest, getPostCaseRequest(), 200, space1)).id;
        await addObservableTo({ caseId, value: '10.0.0.1', auth: space1 });
        await addObservableTo({ caseId, value: '10.0.0.2', auth: space1 });
      });

      it('lets a user with read access to the case list its observables', async () => {
        const page = await findObservables({
          supertest: supertestWithoutAuth,
          caseId,
          auth: { user: secOnlyRead, space: 'space1' },
        });

        expect(page.total).to.be(2);
      });

      it('lets a user with all access to the case list its observables', async () => {
        const page = await findObservables({
          supertest: supertestWithoutAuth,
          caseId,
          auth: { user: secOnly, space: 'space1' },
        });

        expect(page.total).to.be(2);
      });

      it('refuses a user whose access is to cases of another owner', async () => {
        await findObservables({
          supertest: supertestWithoutAuth,
          caseId,
          auth: { user: obsOnly, space: 'space1' },
          expectedHttpCode: 403,
        });
      });

      it('refuses a user with no access to cases', async () => {
        await findObservables({
          supertest: supertestWithoutAuth,
          caseId,
          auth: { user: noKibanaPrivileges, space: 'space1' },
          expectedHttpCode: 403,
        });
      });

      it('refuses a user in a space where they have no access', async () => {
        await findObservables({
          supertest: supertestWithoutAuth,
          caseId,
          auth: { user: secOnly, space: null },
          expectedHttpCode: 403,
        });
      });

      it('does not find the case from another space', async () => {
        await findObservables({
          supertest,
          caseId,
          auth: { user: superUser, space: 'space2' },
          expectedHttpCode: 404,
        });
      });
    });
  });
};
