/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CaseStatuses } from '@kbn/cases-plugin/common/types/domain';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { createCase, deleteAllCaseItems, getCase, updateCase } from '../../../common/lib/api';
import { getPostCaseRequest } from '../../../common/lib/mock';
import { createUsersAndRoles, deleteUsersAndRoles } from '../../../common/lib/authentication';
import {
  casesV2NoCreateCommentWithReopen,
  casesV2NoReopenWithCreateComment,
} from '../../../common/roles';
import {
  casesV2NoCreateCommentWithReopenUser,
  casesV2NoReopenWithCreateCommentUser,
} from '../../../common/users';

const owner = 'cases';
const testUsers = [casesV2NoReopenWithCreateCommentUser, casesV2NoCreateCommentWithReopenUser];
const testRoles = [casesV2NoReopenWithCreateComment, casesV2NoCreateCommentWithReopen];

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('status lifecycle', () => {
    before(async () => {
      await createUsersAndRoles(getService, testUsers, testRoles);
    });

    after(async () => {
      await deleteUsersAndRoles(getService, testUsers, testRoles);
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('closing sets closed_at, closed_by, and the duration', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest({ owner }));
      const [closed] = await updateCase({
        supertest,
        params: {
          cases: [{ id: theCase.id, version: theCase.version, status: CaseStatuses.closed }],
        },
      });

      expect(closed.status).to.be(CaseStatuses.closed);
      expect(closed.closed_at).to.be.a('string');
      expect(closed.closed_by).to.not.be(null);
      expect(closed.duration).to.be.a('number');
    });

    it('moving to in-progress keeps closed_at empty', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest({ owner }));
      const [updated] = await updateCase({
        supertest,
        params: {
          cases: [{ id: theCase.id, version: theCase.version, status: CaseStatuses['in-progress'] }],
        },
      });

      expect(updated.status).to.be(CaseStatuses['in-progress']);
      expect(updated.closed_at).to.be(null);
    });

    it('reopening clears closed_at and closed_by', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest({ owner }));
      const [closed] = await updateCase({
        supertest,
        params: {
          cases: [{ id: theCase.id, version: theCase.version, status: CaseStatuses.closed }],
        },
      });
      const [reopened] = await updateCase({
        supertest,
        params: { cases: [{ id: closed.id, version: closed.version, status: CaseStatuses.open }] },
      });

      expect(reopened.status).to.be(CaseStatuses.open);
      expect(reopened.closed_at).to.be(null);
      expect(reopened.closed_by).to.be(null);
    });

    it('reopening requires the reopen sub-feature privilege', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest({ owner }));
      const [closed] = await updateCase({
        supertest,
        params: {
          cases: [{ id: theCase.id, version: theCase.version, status: CaseStatuses.closed }],
        },
      });

      await updateCase({
        supertest: supertestWithoutAuth,
        params: { cases: [{ id: closed.id, version: closed.version, status: CaseStatuses.open }] },
        expectedHttpCode: 403,
        auth: { user: casesV2NoReopenWithCreateCommentUser, space: null },
      });

      await updateCase({
        supertest: supertestWithoutAuth,
        params: { cases: [{ id: closed.id, version: closed.version, status: CaseStatuses.open }] },
        auth: { user: casesV2NoCreateCommentWithReopenUser, space: null },
      });

      const reopened = await getCase({ supertest, caseId: closed.id });
      expect(reopened.status).to.be(CaseStatuses.open);
    });
  });
};
