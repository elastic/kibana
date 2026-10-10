/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { OBSERVABLE_TYPES_BUILTIN } from '@kbn/cases-plugin/common/constants';
import type { SimilarCasesSearchRequest } from '@kbn/cases-plugin/common/types/api';
import { CaseSeverity } from '@kbn/cases-plugin/common/types/domain';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import { obsOnly } from '../../../../common/lib/authentication/users';
import { observabilityOnlyAll } from '../../../../common/lib/authentication/roles';
import { createUsersAndRoles, deleteUsersAndRoles } from '../../../../common/lib/authentication';
import {
  createCase,
  deleteAllCaseItems,
  addObservable,
  similarCases,
} from '../../../../common/lib/api';

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');

  describe('similar case', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('shows similar cases', () => {
      it('returns cases similar to given case', async () => {
        const [caseA, caseB] = await Promise.all([
          createCase(supertest, getPostCaseRequest()),
          createCase(supertest, getPostCaseRequest()),
          createCase(supertest, getPostCaseRequest()),
        ]);

        const newObservableData = {
          value: 'value',
          typeKey: OBSERVABLE_TYPES_BUILTIN[0].key,
          description: '',
        };

        const { cases } = await similarCases({
          supertest,
          body: { perPage: 10, page: 1 },
          caseId: caseA.id,
        });
        expect(cases.length).to.be(0);

        await addObservable({
          supertest,
          caseId: caseA.id,
          params: {
            observable: newObservableData,
          },
        });

        await addObservable({
          supertest,
          caseId: caseB.id,
          params: {
            observable: newObservableData,
          },
        });

        const { cases: casesSimilarToA } = await similarCases({
          supertest,
          body: { perPage: 10, page: 1 },
          caseId: caseA.id,
        });

        expect(casesSimilarToA.length).to.be(1);

        const { cases: casesSimilarToB } = await similarCases({
          supertest,
          body: { perPage: 10, page: 1 },
          caseId: caseB.id,
        });

        expect(casesSimilarToB.length).to.be(1);
      });

      it('does not return cases similar to given case if the owner does not match', async () => {
        const [caseA, caseB] = await Promise.all([
          createCase(supertest, { ...getPostCaseRequest(), owner: 'observabilityFixture' }),
          createCase(supertest, getPostCaseRequest()),
          createCase(supertest, getPostCaseRequest()),
        ]);

        const newObservableData = {
          value: 'value',
          typeKey: OBSERVABLE_TYPES_BUILTIN[0].key,
          description: '',
        };

        const { cases } = await similarCases({
          supertest,
          body: { perPage: 10, page: 1 },
          caseId: caseA.id,
        });
        expect(cases.length).to.be(0);

        await addObservable({
          supertest,
          caseId: caseA.id,
          params: {
            observable: newObservableData,
          },
        });

        await addObservable({
          supertest,
          caseId: caseB.id,
          params: {
            observable: newObservableData,
          },
        });

        const { cases: casesSimilarToA } = await similarCases({
          supertest,
          body: { perPage: 10, page: 1 },
          caseId: caseA.id,
        });

        expect(casesSimilarToA.length).to.be(0);

        const { cases: casesSimilarToB } = await similarCases({
          supertest,
          body: { perPage: 10, page: 1 },
          caseId: caseB.id,
        });

        expect(casesSimilarToB.length).to.be(0);
      });
    });

    describe('sorting', () => {
      const observable = {
        value: 'value',
        typeKey: OBSERVABLE_TYPES_BUILTIN[0].key,
        description: '',
      };

      const createSimilarCases = async () => {
        const source = await createCase(supertest, getPostCaseRequest());
        const caseB = await createCase(supertest, {
          ...getPostCaseRequest(),
          title: 'B similar case',
          severity: CaseSeverity.HIGH,
        });
        const caseA = await createCase(supertest, {
          ...getPostCaseRequest(),
          title: 'A similar case',
          severity: CaseSeverity.LOW,
        });
        const caseC = await createCase(supertest, {
          ...getPostCaseRequest(),
          title: 'C similar case',
          severity: CaseSeverity.CRITICAL,
        });

        for (const { id } of [source, caseA, caseB, caseC]) {
          await addObservable({ supertest, caseId: id, params: { observable } });
        }

        return { source, caseA, caseB, caseC };
      };

      it('sorts by title in ascending and descending order', async () => {
        const { source, caseA, caseB, caseC } = await createSimilarCases();

        const { cases: ascCases } = await similarCases({
          supertest,
          body: { perPage: 10, page: 1, sortField: 'title', sortOrder: 'asc' },
          caseId: source.id,
        });
        expect(ascCases.map(({ id }) => id)).to.eql([caseA.id, caseB.id, caseC.id]);

        const { cases: descCases } = await similarCases({
          supertest,
          body: { perPage: 10, page: 1, sortField: 'title', sortOrder: 'desc' },
          caseId: source.id,
        });
        expect(descCases.map(({ id }) => id)).to.eql([caseC.id, caseB.id, caseA.id]);
      });

      it('sorts by severity in ascending and descending order', async () => {
        const { source, caseA, caseB, caseC } = await createSimilarCases();

        const { cases: ascCases } = await similarCases({
          supertest,
          body: { perPage: 10, page: 1, sortField: 'severity', sortOrder: 'asc' },
          caseId: source.id,
        });
        expect(ascCases.map(({ id }) => id)).to.eql([caseA.id, caseB.id, caseC.id]);

        const { cases: descCases } = await similarCases({
          supertest,
          body: { perPage: 10, page: 1, sortField: 'severity', sortOrder: 'desc' },
          caseId: source.id,
        });
        expect(descCases.map(({ id }) => id)).to.eql([caseC.id, caseB.id, caseA.id]);
      });

      it('returns a 400 for an invalid sortField', async () => {
        const { source } = await createSimilarCases();

        await similarCases({
          supertest,
          body: {
            perPage: 10,
            page: 1,
            sortField: 'notAField' as SimilarCasesSearchRequest['sortField'],
          },
          caseId: source.id,
          expectedHttpCode: 400,
        });
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      describe('sorted request by a user of another owner', () => {
        before(async () => {
          await createUsersAndRoles(getService, [obsOnly], [observabilityOnlyAll]);
        });

        after(async () => {
          await deleteUsersAndRoles(getService, [obsOnly], [observabilityOnlyAll]);
        });

        it('does not return similar cases of another owner when sorting', async () => {
          const [caseA, caseB] = await Promise.all([
            createCase(supertest, getPostCaseRequest()),
            createCase(supertest, getPostCaseRequest()),
          ]);
          const observable = {
            value: 'value',
            typeKey: OBSERVABLE_TYPES_BUILTIN[0].key,
            description: '',
          };

          await addObservable({ supertest, caseId: caseA.id, params: { observable } });
          await addObservable({ supertest, caseId: caseB.id, params: { observable } });

          await similarCases({
            supertest: supertestWithoutAuth,
            body: { perPage: 10, page: 1, sortField: 'title', sortOrder: 'asc' },
            caseId: caseA.id,
            auth: { user: obsOnly, space: null },
            expectedHttpCode: 403,
          });
        });
      });

      it('should not getting similar cases without permissions', async () => {
        await similarCases({
          supertest: supertestWithoutAuth,
          body: { perPage: 10, page: 1 },
          caseId: 'mock-case-id',
          expectedHttpCode: 403,
        });
      });
    });
  });
};
