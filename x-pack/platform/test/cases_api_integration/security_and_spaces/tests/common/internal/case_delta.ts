/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CaseSeverity } from '@kbn/cases-plugin/common/types/domain';
import type { User } from '../../../../common/lib/authentication/types';
import {
  noKibanaPrivileges,
  obsOnly,
  secOnly,
  superUser,
} from '../../../../common/lib/authentication/users';
import { getPostCaseRequest, postCommentUserReq } from '../../../../common/lib/mock';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  getCaseDelta,
  recordCaseView,
  summarizeCaseDelta,
  updateCase,
} from '../../../../common/lib/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  // `supertest` always sends the superuser credentials, so it cannot act as another user.
  const supertest = getService('supertestWithoutAuth');
  const es = getService('es');

  // The security-only users have access in space1 only.
  const space = 'space1';
  const as = (user: User) => ({ user, space });

  describe('case delta (internal)', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('returns no window on the first visit', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest(), 200, as(superUser));

      const viewed = await recordCaseView({ supertest, caseId: theCase.id, auth: as(superUser) });
      const delta = await getCaseDelta({ supertest, caseId: theCase.id, auth: as(superUser) });

      expect(viewed).to.eql({ since: null });
      expect(delta).to.eql({
        since: null,
        counts: { alerts: 0, comments: 0, changes: 0, evidence: 0 },
        items: [],
        aiSummaryAvailable: false,
      });
    });

    it('lists the activity of other users after the user marks the case as seen', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest(), 200, as(superUser));
      const { since } = await recordCaseView({
        supertest,
        caseId: theCase.id,
        markSeen: true,
        auth: as(superUser),
      });

      await createComment({
        supertest,
        caseId: theCase.id,
        params: postCommentUserReq,
        auth: as(secOnly),
      });
      await updateCase({
        supertest,
        params: {
          cases: [{ id: theCase.id, version: theCase.version, severity: CaseSeverity.HIGH }],
        },
        auth: as(secOnly),
      });

      const delta = await getCaseDelta({ supertest, caseId: theCase.id, auth: as(superUser) });

      expect(since).to.not.be(null);
      expect(delta.since).to.be(since);
      expect(delta.counts).to.eql({ alerts: 0, comments: 1, changes: 1, evidence: 0 });
      expect(delta.items.map(({ category, type }) => [category, type]).sort()).to.eql([
        ['changes', 'severity'],
        ['comments', 'comment'],
      ]);
      // The FTR users get their full name from the username (see `createUsersAndRoles`).
      expect(delta.items.every(({ author }) => author === 'sec only')).to.be(true);
    });

    it('does not count the activity of the user', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest(), 200, as(superUser));
      await recordCaseView({
        supertest,
        caseId: theCase.id,
        markSeen: true,
        auth: as(superUser),
      });

      await createComment({
        supertest,
        caseId: theCase.id,
        params: postCommentUserReq,
        auth: as(superUser),
      });

      const delta = await getCaseDelta({ supertest, caseId: theCase.id, auth: as(superUser) });

      expect(delta.counts).to.eql({ alerts: 0, comments: 0, changes: 0, evidence: 0 });
      expect(delta.items).to.eql([]);
    });

    it('keeps a separate window for each user', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest(), 200, as(superUser));
      await recordCaseView({
        supertest,
        caseId: theCase.id,
        markSeen: true,
        auth: as(superUser),
      });

      const delta = await getCaseDelta({
        supertest,
        caseId: theCase.id,
        auth: as(secOnly),
      });

      expect(delta.since).to.be(null);
    });

    it('moves the window start to now when the user marks the case as seen again', async () => {
      const theCase = await createCase(supertest, getPostCaseRequest(), 200, as(superUser));
      await recordCaseView({
        supertest,
        caseId: theCase.id,
        markSeen: true,
        auth: as(superUser),
      });
      await createComment({
        supertest,
        caseId: theCase.id,
        params: postCommentUserReq,
        auth: as(secOnly),
      });
      expect(
        (await getCaseDelta({ supertest, caseId: theCase.id, auth: as(superUser) })).counts.comments
      ).to.be(1);

      await recordCaseView({
        supertest,
        caseId: theCase.id,
        markSeen: true,
        auth: as(superUser),
      });

      expect(
        (await getCaseDelta({ supertest, caseId: theCase.id, auth: as(superUser) })).counts.comments
      ).to.be(0);
    });

    describe('AI summary', () => {
      it('is not available and has no route while the AI summary is off', async () => {
        const theCase = await createCase(supertest, getPostCaseRequest(), 200, as(superUser));
        await recordCaseView({
          supertest,
          caseId: theCase.id,
          markSeen: true,
          auth: as(superUser),
        });
        await createComment({
          supertest,
          caseId: theCase.id,
          params: postCommentUserReq,
          auth: as(secOnly),
        });

        const delta = await getCaseDelta({ supertest, caseId: theCase.id, auth: as(superUser) });

        expect(delta.items.length).to.be(1);
        expect(delta.aiSummaryAvailable).to.be(false);
        await summarizeCaseDelta({
          supertest,
          caseId: theCase.id,
          expectedHttpCode: 404,
          auth: as(superUser),
        });
      });
    });

    describe('rbac', () => {
      it('returns 403 for a user that cannot read the case', async () => {
        const theCase = await createCase(supertest, getPostCaseRequest(), 200, as(superUser));

        for (const user of [obsOnly, noKibanaPrivileges]) {
          await getCaseDelta({
            supertest,
            caseId: theCase.id,
            expectedHttpCode: 403,
            auth: as(user),
          });
          await recordCaseView({
            supertest,
            caseId: theCase.id,
            expectedHttpCode: 403,
            auth: as(user),
          });
        }
      });

      it('returns 404 for a case that does not exist', async () => {
        await getCaseDelta({
          supertest,
          caseId: 'not-a-case',
          expectedHttpCode: 404,
          auth: as(superUser),
        });
      });
    });
  });
};
