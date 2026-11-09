/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import {
  MAX_BULK_CREATE_OBSERVABLES,
  MAX_OBSERVABLES_PER_CASE,
  MAX_STORED_OBSERVABLES_PER_CASE,
  OBSERVABLE_TYPE_HOSTNAME,
  OBSERVABLE_TYPE_IPV4,
} from '@kbn/cases-plugin/common/constants';
import type { Observable } from '@kbn/cases-plugin/common/types/domain';
import type { ObservablePost } from '@kbn/cases-plugin/common/types/api';
import {
  noKibanaPrivileges,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  addObservable,
  bulkCreateObservables,
  bulkDeleteObservables,
  countCaseObservableObjects,
  createCase,
  deleteAllCaseItems,
  deleteObservable,
  findObservables,
  getCase,
  searchCases,
  similarCases,
  updateObservable,
} from '../../../../common/lib/api';
import { deleteCases } from '../../../../common/lib/api/case';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

const ipv4 = (index: number): ObservablePost => ({
  typeKey: OBSERVABLE_TYPE_IPV4.key,
  value: `10.${Math.floor(index / 62_500) % 256}.${Math.floor(index / 250) % 250}.${index % 250}`,
  description: null,
});

const ipv4s = (from: number, count: number): ObservablePost[] =>
  Array.from({ length: count }, (_, i) => ipv4(from + i));

const ndjsonToObjects = (input: string): Array<Record<string, unknown>> =>
  input
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line));

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const retry = getService('retry');

  /**
   * Observables already in the case field before this change. Adds no longer write the field, so
   * the tests put them there the way an earlier release did.
   */
  const seedFieldObservables = async (caseId: string, observables: ObservablePost[]) => {
    const now = new Date().toISOString();
    const fieldObservables: Observable[] = observables.map((observable) => ({
      ...observable,
      description: observable.description ?? null,
      id: uuidv4(),
      createdAt: now,
      updatedAt: null,
    }));

    await es.update({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      id: `cases:${caseId}`,
      doc: { cases: { observables: fieldObservables, total_observables: fieldObservables.length } },
      refresh: true,
    });

    return fieldObservables;
  };

  const getCaseFieldObservables = async (caseId: string): Promise<Observable[]> => {
    const { _source: source } = await es.get<{ cases: { observables?: Observable[] } }>({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      id: `cases:${caseId}`,
    });
    return source?.cases.observables ?? [];
  };

  const findAll = async (caseId: string, perPage = 10) => {
    const seen: Observable[] = [];
    let cursor: string | undefined;
    let total = 0;

    do {
      const page = await findObservables({ supertest, caseId, params: { perPage, cursor } });
      seen.push(...page.observables);
      total = page.total;
      cursor = page.cursor;
    } while (cursor != null);

    return { observables: seen, total };
  };

  describe('observables at scale', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('writes', () => {
      it('adds new observables as cases-observables objects, not to the case field', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        const updatedCase = await addObservable({
          supertest,
          caseId: postedCase.id,
          params: { observable: ipv4(1) },
        });

        expect(updatedCase.observables.map(({ value }) => value)).to.eql([ipv4(1).value]);
        expect(updatedCase.total_observables).to.be(1);
        expect(await getCaseFieldObservables(postedCase.id)).to.eql([]);
        expect(await countCaseObservableObjects(es, postedCase.id)).to.be(1);
      });

      it('bulk creates up to 1,000 and reports repeats', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        await seedFieldObservables(postedCase.id, [ipv4(0)]);

        const result = await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: [ipv4(0), ...ipv4s(1, 5), ipv4(1)] },
        });

        expect(result.added.length).to.be(5);
        expect(result.skipped_duplicates.map(({ value }) => value)).to.eql([
          ipv4(0).value,
          ipv4(1).value,
        ]);
        expect(result.skipped_over_cap).to.eql([]);
        expect(result.total_observables).to.be(6);
      });

      it('rejects a bulk create of more than 1,000', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: ipv4s(0, MAX_BULK_CREATE_OBSERVABLES + 1) },
          expectedHttpCode: 400,
        });
      });

      it('rejects an add that repeats an observable of the case field', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        await seedFieldObservables(postedCase.id, [ipv4(0)]);

        await addObservable({
          supertest,
          caseId: postedCase.id,
          params: { observable: ipv4(0) },
          expectedHttpCode: 400,
        });
      });

      it(`stops at ${MAX_STORED_OBSERVABLES_PER_CASE} and reports the observables that did not fit`, async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());

        for (
          let from = 0;
          from < MAX_STORED_OBSERVABLES_PER_CASE;
          from += MAX_BULK_CREATE_OBSERVABLES
        ) {
          await bulkCreateObservables({
            supertest,
            caseId: postedCase.id,
            params: { observables: ipv4s(from, MAX_BULK_CREATE_OBSERVABLES) },
          });
        }

        const result = await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: ipv4s(MAX_STORED_OBSERVABLES_PER_CASE, 2) },
        });

        expect(result.added).to.eql([]);
        expect(result.skipped_over_cap.length).to.be(2);
        expect(result.total_observables).to.be(MAX_STORED_OBSERVABLES_PER_CASE);

        await addObservable({
          supertest,
          caseId: postedCase.id,
          params: { observable: ipv4(MAX_STORED_OBSERVABLES_PER_CASE + 5) },
          expectedHttpCode: 400,
        });
      });
    });

    describe('case responses', () => {
      it('lists the case field first, then the oldest objects, up to 50, and counts both', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const fieldObservables = await seedFieldObservables(postedCase.id, ipv4s(0, 3));
        await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: ipv4s(100, 60) },
        });

        const theCase = await getCase({ supertest, caseId: postedCase.id });

        expect(theCase.total_observables).to.be(63);
        expect(theCase.observables.length).to.be(MAX_OBSERVABLES_PER_CASE);
        expect(theCase.observables.slice(0, 3).map(({ id }) => id)).to.eql(
          fieldObservables.map(({ id }) => id)
        );
        // The type's objects keep the order of the request that added them.
        expect(theCase.observables.slice(3).map(({ value }) => value)).to.eql(
          ipv4s(100, 47).map(({ value }) => value)
        );
      });

      it('returns the preview from case find and search', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: ipv4s(0, 55) },
        });

        const { cases } = await searchCases({
          supertest,
          body: { owner: ['securitySolutionFixture'] },
        });
        const found = cases.find(({ id }) => id === postedCase.id);

        expect(found?.observables.length).to.be(MAX_OBSERVABLES_PER_CASE);
        expect(found?.total_observables).to.be(55);
      });
    });

    describe('list route', () => {
      it('pages across both stores with a cursor', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        await seedFieldObservables(postedCase.id, ipv4s(0, 2));
        await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: ipv4s(10, 25) },
        });

        const { observables, total } = await findAll(postedCase.id);

        expect(total).to.be(27);
        expect(new Set(observables.map(({ id }) => id)).size).to.be(27);
      });

      it('sorts, filters by type and searches by the start of the value, in both stores', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        await seedFieldObservables(postedCase.id, [
          { typeKey: OBSERVABLE_TYPE_HOSTNAME.key, value: 'web-01', description: null },
          ipv4(1),
        ]);
        await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: {
            observables: [
              { typeKey: OBSERVABLE_TYPE_HOSTNAME.key, value: 'Web-02', description: null },
              { typeKey: OBSERVABLE_TYPE_HOSTNAME.key, value: 'db-01', description: null },
              ipv4(2),
            ],
          },
        });

        const byValue = await findObservables({
          supertest,
          caseId: postedCase.id,
          params: {
            sortField: 'value',
            sortOrder: 'desc',
            typeKeys: [OBSERVABLE_TYPE_HOSTNAME.key],
          },
        });
        expect(byValue.observables.map(({ value }) => value)).to.eql(['web-01', 'db-01', 'Web-02']);
        expect(byValue.total).to.be(3);

        const byPrefix = await findObservables({
          supertest,
          caseId: postedCase.id,
          params: { search: 'WEB' },
        });
        expect(byPrefix.observables.map(({ value }) => value).sort()).to.eql(['Web-02', 'web-01']);

        const noSubstring = await findObservables({
          supertest,
          caseId: postedCase.id,
          params: { search: 'eb-0' },
        });
        expect(noSubstring.total).to.be(0);
      });
    });

    describe('edits and deletes in either store', () => {
      it('updates and deletes an observable of the type by id', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const { added } = await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: ipv4s(0, 2) },
        });

        const updatedCase = await updateObservable({
          supertest,
          caseId: postedCase.id,
          observableId: added[0].id,
          params: { observable: { value: '192.168.1.1', description: 'edited' } },
        });
        const edited = updatedCase.observables.find(({ id }) => id === added[0].id);
        expect(edited?.value).to.be('192.168.1.1');
        expect(edited?.description).to.be('edited');
        expect(edited?.updatedAt).not.to.be(null);

        await deleteObservable({
          supertest,
          caseId: postedCase.id,
          observableId: added[1].id,
          expectedHttpCode: 204,
        });

        expect(await countCaseObservableObjects(es, postedCase.id)).to.be(1);
        expect((await getCase({ supertest, caseId: postedCase.id })).total_observables).to.be(1);
      });

      it('rejects a value edit that repeats an observable of the other store', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const [fieldObservable] = await seedFieldObservables(postedCase.id, [ipv4(0)]);
        const { added } = await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: [ipv4(1)] },
        });

        await updateObservable({
          supertest,
          caseId: postedCase.id,
          observableId: added[0].id,
          params: { observable: { value: ipv4(0).value, description: null } },
          expectedHttpCode: 400,
        });
        await updateObservable({
          supertest,
          caseId: postedCase.id,
          observableId: fieldObservable.id,
          params: { observable: { value: ipv4(1).value, description: null } },
          expectedHttpCode: 400,
        });
      });

      it('bulk deletes observables of both stores', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        const [fieldObservable] = await seedFieldObservables(postedCase.id, ipv4s(0, 2));
        const { added } = await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: ipv4s(10, 2) },
        });

        await bulkDeleteObservables({
          supertest,
          caseId: postedCase.id,
          observableIds: [fieldObservable.id, added[0].id],
        });

        expect((await getCase({ supertest, caseId: postedCase.id })).total_observables).to.be(2);
        expect((await getCaseFieldObservables(postedCase.id)).length).to.be(1);
        expect(await countCaseObservableObjects(es, postedCase.id)).to.be(1);
      });
    });

    describe('case delete, export and import', () => {
      it('deletes the observables of a deleted case in the background', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: ipv4s(0, 1_000) },
        });
        await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: ipv4s(1_000, 200) },
        });

        await deleteCases({ supertest, caseIDs: [postedCase.id] });

        await retry.tryForTime(60_000, async () => {
          expect(await countCaseObservableObjects(es, postedCase.id)).to.be(0);
        });
      });

      it('exports a case with its observables and imports them with the case', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: { observables: ipv4s(0, 3) },
        });

        const { text } = await supertest
          .post('/api/saved_objects/_export')
          .send({ type: ['cases'], excludeExportDetails: true, includeReferencesDeep: true })
          .set('kbn-xsrf', 'true')
          .expect(200);

        const exported = ndjsonToObjects(text);
        expect(exported.filter(({ type }) => type === 'cases-observables').length).to.be(3);

        const { body: importResult } = await supertest
          .post('/api/saved_objects/_import?createNewCopies=true')
          .set('kbn-xsrf', 'true')
          .attach('file', Buffer.from(text), 'cases.ndjson')
          .expect(200);

        const importedCaseId = importResult.successResults.find(
          ({ type }: { type: string }) => type === 'cases'
        ).destinationId;

        expect(await countCaseObservableObjects(es, importedCaseId)).to.be(3);
        expect((await getCase({ supertest, caseId: importedCaseId })).total_observables).to.be(3);
      });
    });

    describe('other readers', () => {
      it('finds a case by the start of an observable value held by the type', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest());
        await createCase(supertest, getPostCaseRequest());
        await bulkCreateObservables({
          supertest,
          caseId: postedCase.id,
          params: {
            observables: [
              {
                typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
                value: 'Payments-API-01',
                description: null,
              },
            ],
          },
        });

        const { cases } = await searchCases({
          supertest,
          body: {
            owner: ['securitySolutionFixture'],
            search: 'payments-api',
            searchFields: ['cases.observables.value'],
          },
        });

        expect(cases.map(({ id }) => id)).to.eql([postedCase.id]);
      });

      it('finds similar cases through observables of either store', async () => {
        const source = await createCase(supertest, getPostCaseRequest());
        const throughType = await createCase(supertest, getPostCaseRequest());
        const throughField = await createCase(supertest, getPostCaseRequest());
        await createCase(supertest, getPostCaseRequest());

        await bulkCreateObservables({
          supertest,
          caseId: source.id,
          params: { observables: ipv4s(0, 2) },
        });
        await bulkCreateObservables({
          supertest,
          caseId: throughType.id,
          params: { observables: [ipv4(0)] },
        });
        await seedFieldObservables(throughField.id, [ipv4(1)]);

        const res = await similarCases({
          supertest,
          caseId: source.id,
          body: { page: 1, perPage: 10 },
        });

        expect(res.total).to.be(2);
        expect(res.cases.map(({ id }) => id).sort()).to.eql(
          [throughType.id, throughField.id].sort()
        );
        const typeMatch = res.cases.find(({ id }) => id === throughType.id);
        expect(typeMatch?.similarities.observables.map(({ value }) => value)).to.eql([
          ipv4(0).value,
        ]);
      });
    });

    describe('permissions', () => {
      it('lets a read-only user list observables but not add them', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest(), 200, {
          user: superUser,
          space: 'space1',
        });

        await findObservables({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          auth: { user: secOnlyRead, space: 'space1' },
        });
        await bulkCreateObservables({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: { observables: [ipv4(0)] },
          auth: { user: secOnlyRead, space: 'space1' },
          expectedHttpCode: 403,
        });
        await bulkCreateObservables({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: { observables: [ipv4(0)] },
          auth: { user: secOnly, space: 'space1' },
        });
      });

      it('does not list observables for a user without access to cases', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest(), 200, {
          user: superUser,
          space: 'space1',
        });

        await findObservables({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          auth: { user: noKibanaPrivileges, space: 'space1' },
          expectedHttpCode: 403,
        });
      });

      it('does not list the observables of a case in another space', async () => {
        const postedCase = await createCase(supertest, getPostCaseRequest(), 200, {
          user: superUser,
          space: 'space1',
        });

        await findObservables({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          auth: { user: superUser, space: 'space2' },
          expectedHttpCode: 404,
        });
      });
    });
  });
};
