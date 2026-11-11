/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server';
import { OBSERVABLE_TYPE_HOSTNAME, OBSERVABLE_TYPE_IPV4 } from '@kbn/cases-plugin/common/constants';
import type { Observable } from '@kbn/cases-plugin/common/types/domain';
import type {
  FindCasesByObservableRequest,
  ObservablePost,
} from '@kbn/cases-plugin/common/types/api';
import {
  noKibanaPrivileges,
  obsOnly,
  secOnly,
  superUser,
} from '../../../../common/lib/authentication/users';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  addObservable,
  countCasesByObservables,
  createCase,
  deleteAllCaseItems,
  findCasesByObservable,
} from '../../../../common/lib/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

const ipv4 = (value: string): ObservablePost => ({
  typeKey: OBSERVABLE_TYPE_IPV4.key,
  value,
  description: null,
});

const hostname = (value: string): ObservablePost => ({
  typeKey: OBSERVABLE_TYPE_HOSTNAME.key,
  value,
  description: null,
});

const byIpv4 = (
  value: string,
  rest: Partial<FindCasesByObservableRequest> = {}
): FindCasesByObservableRequest => ({
  owner: 'securitySolutionFixture',
  typeKey: OBSERVABLE_TYPE_IPV4.key,
  value,
  ...rest,
});

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  /** Observables already in the case field, the way an earlier release stored them. */
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
  };

  const addToType = (
    caseId: string,
    observable: ObservablePost,
    auth: { user: typeof superUser; space: string | null } = { user: superUser, space: null }
  ) => addObservable({ supertest, caseId, params: { observable }, auth });

  const createTitledCase = (title: string, owner = 'securitySolutionFixture') =>
    createCase(supertest, getPostCaseRequest({ title, owner }));

  const titlesOf = (cases: Array<{ title: string }>) => cases.map(({ title }) => title).sort();

  describe('find cases by observable', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('matching', () => {
      it('finds the cases holding the value in the case field or as an object, once each', async () => {
        const source = await createTitledCase('source');
        const inField = await createTitledCase('in field');
        const inType = await createTitledCase('in type');
        const inBoth = await createTitledCase('in both');
        const otherValue = await createTitledCase('other value');
        const otherType = await createTitledCase('other type');

        await addToType(source.id, ipv4('10.0.0.8'));
        await seedFieldObservables(inField.id, [ipv4('10.0.0.8')]);
        await addToType(inType.id, ipv4('10.0.0.8'));
        await addToType(inBoth.id, ipv4('10.0.0.8'));
        await seedFieldObservables(inBoth.id, [ipv4('10.0.0.8')]);
        await addToType(otherValue.id, ipv4('10.0.0.80'));
        await seedFieldObservables(otherValue.id, [ipv4('10.0.0.9')]);
        await addToType(otherType.id, hostname('10.0.0.8'));

        const res = await findCasesByObservable({
          supertest,
          params: byIpv4('10.0.0.8', { excludeCaseId: source.id }),
        });

        expect(res.total).to.be(3);
        expect(titlesOf(res.cases)).to.eql(['in both', 'in field', 'in type']);
      });

      it('includes the case it starts from when none is excluded', async () => {
        const source = await createTitledCase('source');
        const other = await createTitledCase('other');
        await addToType(source.id, ipv4('10.0.0.8'));
        await addToType(other.id, ipv4('10.0.0.8'));

        const res = await findCasesByObservable({ supertest, params: byIpv4('10.0.0.8') });

        expect(titlesOf(res.cases)).to.eql(['other', 'source']);
      });

      it('matches the value exactly, minding case', async () => {
        const exact = await createTitledCase('exact');
        const otherCase = await createTitledCase('other case');
        await addToType(exact.id, hostname('Host-1'));
        await addToType(otherCase.id, hostname('host-1'));

        const res = await findCasesByObservable({
          supertest,
          params: { ...byIpv4('Host-1'), typeKey: OBSERVABLE_TYPE_HOSTNAME.key },
        });

        expect(titlesOf(res.cases)).to.eql(['exact']);
      });

      it('returns the attachment totals of each case', async () => {
        const theCase = await createTitledCase('with totals');
        await addToType(theCase.id, ipv4('10.0.0.8'));

        const {
          cases: [found],
        } = await findCasesByObservable({ supertest, params: byIpv4('10.0.0.8') });

        expect(found.id).to.be(theCase.id);
        expect(found.totalComment).to.be(0);
        expect(found.totalAlerts).to.be(0);
        expect(found.total_observables).to.be(1);
      });
    });

    describe('paging', () => {
      it('returns only the total for perPage 0', async () => {
        for (const title of ['a', 'b', 'c']) {
          const theCase = await createTitledCase(title);
          await addToType(theCase.id, ipv4('10.0.0.8'));
        }

        const res = await findCasesByObservable({
          supertest,
          params: byIpv4('10.0.0.8', { perPage: 0 }),
        });

        expect(res.cases).to.eql([]);
        expect(res.total).to.be(3);
        expect(res.total_relation).to.be('eq');
        expect(res.per_page).to.be(0);
      });

      it('pages and sorts across both stores', async () => {
        for (const [index, title] of ['a', 'b', 'c', 'd', 'e'].entries()) {
          const theCase = await createTitledCase(title);
          if (index % 2 === 0) {
            await addToType(theCase.id, ipv4('10.0.0.8'));
          } else {
            await seedFieldObservables(theCase.id, [ipv4('10.0.0.8')]);
          }
        }

        const firstPage = await findCasesByObservable({
          supertest,
          params: byIpv4('10.0.0.8', { page: 1, perPage: 2, sortField: 'title', sortOrder: 'asc' }),
        });
        const lastPage = await findCasesByObservable({
          supertest,
          params: byIpv4('10.0.0.8', { page: 3, perPage: 2, sortField: 'title', sortOrder: 'asc' }),
        });

        expect(firstPage.total).to.be(5);
        expect(firstPage.cases.map(({ title }) => title)).to.eql(['a', 'b']);
        expect(lastPage.cases.map(({ title }) => title)).to.eql(['e']);
      });

      it('rejects more than 100 cases per page', async () => {
        await findCasesByObservable({
          supertest,
          params: byIpv4('10.0.0.8', { perPage: 101 }),
          expectedHttpCode: 400,
        });
      });
    });

    describe('scope', () => {
      it('keeps to the requested owner', async () => {
        const security = await createTitledCase('security');
        const observability = await createTitledCase('observability', 'observabilityFixture');
        await addToType(security.id, ipv4('10.0.0.8'));
        await addToType(observability.id, ipv4('10.0.0.8'));

        const securityCases = await findCasesByObservable({
          supertest,
          params: byIpv4('10.0.0.8'),
        });
        const observabilityCases = await findCasesByObservable({
          supertest,
          params: byIpv4('10.0.0.8', { owner: 'observabilityFixture' }),
        });

        expect(titlesOf(securityCases.cases)).to.eql(['security']);
        expect(titlesOf(observabilityCases.cases)).to.eql(['observability']);
      });

      it('keeps to the space of the request', async () => {
        const inDefault = await createTitledCase('default space');
        const inSpace1 = await createCase(supertest, getPostCaseRequest({ title: 'space1' }), 200, {
          user: superUser,
          space: 'space1',
        });
        await addToType(inDefault.id, ipv4('10.0.0.8'));
        await addToType(inSpace1.id, ipv4('10.0.0.8'), { user: superUser, space: 'space1' });

        const res = await findCasesByObservable({
          supertest,
          params: byIpv4('10.0.0.8'),
          auth: { user: superUser, space: 'space1' },
        });

        expect(titlesOf(res.cases)).to.eql(['space1']);
      });
    });

    describe('counts for a page', () => {
      it('counts each observable across both stores, the same as the find total', async () => {
        const source = await createTitledCase('source');
        const inField = await createTitledCase('in field');
        const inType = await createTitledCase('in type');
        await addToType(source.id, ipv4('10.0.0.8'));
        await addToType(source.id, ipv4('10.0.0.9'));
        await seedFieldObservables(inField.id, [ipv4('10.0.0.8')]);
        await addToType(inType.id, ipv4('10.0.0.8'));

        const { counts } = await countCasesByObservables({
          supertest,
          params: {
            owner: 'securitySolutionFixture',
            excludeCaseId: source.id,
            observables: [
              { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.8' },
              { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.9' },
            ],
          },
        });
        const { total } = await findCasesByObservable({
          supertest,
          params: byIpv4('10.0.0.8', { excludeCaseId: source.id, perPage: 0 }),
        });

        expect(counts).to.eql([
          { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.8', total: 2 },
          { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.9', total: 0 },
        ]);
        expect(total).to.be(2);
      });

      it('counts each case once per store and leaves out the excluded case', async () => {
        const source = await createTitledCase('source');
        const titles = ['field 1', 'field 2', 'type 1', 'type 2', 'type 3'];
        const cases = await Promise.all(titles.map((title) => createTitledCase(title)));
        await seedFieldObservables(source.id, [ipv4('10.0.0.8')]);
        await seedFieldObservables(cases[0].id, [ipv4('10.0.0.8'), hostname('host-1')]);
        await seedFieldObservables(cases[1].id, [ipv4('10.0.0.8')]);
        for (const theCase of cases.slice(2)) {
          await addToType(theCase.id, ipv4('10.0.0.8'));
        }
        await addToType(cases[2].id, hostname('host-1'));

        const { counts } = await countCasesByObservables({
          supertest,
          params: {
            owner: 'securitySolutionFixture',
            excludeCaseId: source.id,
            observables: [
              { typeKey: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.8' },
              { typeKey: OBSERVABLE_TYPE_HOSTNAME.key, value: 'host-1' },
            ],
          },
        });

        expect(counts.map(({ total }) => total)).to.eql([5, 2]);
      });

      it('counts none for an owner the user cannot read, and rejects a user without privileges', async () => {
        const observability = await createCase(
          supertest,
          getPostCaseRequest({ title: 'observability', owner: 'observabilityFixture' }),
          200,
          { user: superUser, space: 'space1' }
        );
        await addToType(observability.id, ipv4('10.0.0.8'), { user: superUser, space: 'space1' });
        const params = {
          owner: 'observabilityFixture',
          observables: [{ typeKey: OBSERVABLE_TYPE_IPV4.key, value: '10.0.0.8' }],
        };

        const asSecurityUser = await countCasesByObservables({
          supertest: supertestWithoutAuth,
          params,
          auth: { user: secOnly, space: 'space1' },
        });
        const asObservabilityUser = await countCasesByObservables({
          supertest: supertestWithoutAuth,
          params,
          auth: { user: obsOnly, space: 'space1' },
        });
        await countCasesByObservables({
          supertest: supertestWithoutAuth,
          params,
          auth: { user: noKibanaPrivileges, space: 'space1' },
          expectedHttpCode: 403,
        });

        expect(asSecurityUser.counts[0].total).to.be(0);
        expect(asObservabilityUser.counts[0].total).to.be(1);
      });
    });

    describe('rbac', () => {
      it('returns no cases of an owner the user cannot read', async () => {
        const observability = await createCase(
          supertest,
          getPostCaseRequest({ title: 'observability', owner: 'observabilityFixture' }),
          200,
          { user: superUser, space: 'space1' }
        );
        await addToType(observability.id, ipv4('10.0.0.8'), { user: superUser, space: 'space1' });

        const asSecurityUser = await findCasesByObservable({
          supertest: supertestWithoutAuth,
          params: byIpv4('10.0.0.8', { owner: 'observabilityFixture' }),
          auth: { user: secOnly, space: 'space1' },
        });
        const asObservabilityUser = await findCasesByObservable({
          supertest: supertestWithoutAuth,
          params: byIpv4('10.0.0.8', { owner: 'observabilityFixture' }),
          auth: { user: obsOnly, space: 'space1' },
        });

        expect(asSecurityUser.cases).to.eql([]);
        expect(asSecurityUser.total).to.be(0);
        expect(titlesOf(asObservabilityUser.cases)).to.eql(['observability']);
      });

      it('rejects a user without cases privileges', async () => {
        await findCasesByObservable({
          supertest: supertestWithoutAuth,
          params: byIpv4('10.0.0.8'),
          auth: { user: noKibanaPrivileges, space: 'space1' },
          expectedHttpCode: 403,
        });
      });
    });
  });
};
