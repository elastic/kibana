/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Case } from '@kbn/cases-plugin/common/types/domain';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  postCaseReq,
  postCommentUserReq,
  postCommentAlertReq,
  getPostCaseRequest,
} from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  createComment,
  findUnifiedAttachments,
  ensureSavedObjectIsAuthorized,
  superUserSpace1Auth,
} from '../../../../common/lib/api';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  obsSec,
  obsSecRead,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('find_attachments', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should find all case attachments', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment({ supertest, caseId: postedCase.id, params: postCommentUserReq });
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });

      const attachments = await findUnifiedAttachments({ supertest, caseId: postedCase.id });

      expect(attachments.data.map((a) => a.id).sort()).to.eql(
        patchedCase.comments!.map((c) => c.id).sort()
      );
      expect(attachments.data.every((a) => a.type === 'comment')).to.eql(true);
    });

    it('filters by `type`', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });
      await createComment({ supertest, caseId: postedCase.id, params: postCommentAlertReq });

      const attachments = await findUnifiedAttachments({
        supertest,
        caseId: postedCase.id,
        query: { type: 'comment' },
      });

      expect(attachments.data.length).to.eql(1);
      expect(attachments.data[0].id).to.eql(patchedCase.comments![0].id);
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should return only attachments the user is authorized for', async () => {
        const caseInfo: Case = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          params: postCommentUserReq,
          auth: superUserSpace1Auth,
        });

        for (const scenario of [
          { user: globalRead, owners: ['securitySolutionFixture', 'observabilityFixture'] },
          { user: superUser, owners: ['securitySolutionFixture', 'observabilityFixture'] },
          { user: secOnly, owners: ['securitySolutionFixture'] },
          { user: secOnlyRead, owners: ['securitySolutionFixture'] },
          { user: obsSec, owners: ['securitySolutionFixture', 'observabilityFixture'] },
          { user: obsSecRead, owners: ['securitySolutionFixture', 'observabilityFixture'] },
        ]) {
          const attachments = await findUnifiedAttachments({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            auth: { user: scenario.user, space: 'space1' },
          });

          ensureSavedObjectIsAuthorized(attachments.data, 1, scenario.owners);
        }
      });

      it('returns no attachments for a user with an unrelated owner', async () => {
        const caseInfo: Case = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          params: postCommentUserReq,
          auth: superUserSpace1Auth,
        });

        for (const user of [obsOnly, obsOnlyRead]) {
          const attachments = await findUnifiedAttachments({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            auth: { user, space: 'space1' },
          });

          expect(attachments.data.length).to.eql(0);
        }
      });

      it('should NOT find attachments without any Cases privileges', async () => {
        const caseInfo: Case = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          params: postCommentUserReq,
          auth: superUserSpace1Auth,
        });

        await findUnifiedAttachments({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          auth: { user: noKibanaPrivileges, space: 'space1' },
          expectedHttpCode: 403,
        });
      });
    });
  });
};
