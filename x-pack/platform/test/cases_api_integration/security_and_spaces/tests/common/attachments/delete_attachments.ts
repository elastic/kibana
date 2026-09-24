/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Case } from '@kbn/cases-plugin/common/types/domain';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { getPostCaseRequest, postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  createComment,
  deleteAllAttachmentsV2,
  getAllComments,
  superUserSpace1Auth,
} from '../../../../common/lib/api';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnly,
  obsOnlyRead,
  secOnly,
  superUser,
} from '../../../../common/lib/authentication/users';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('delete_attachments', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should delete all attachments for a case', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });

      await deleteAllAttachmentsV2({ supertest, caseId: postedCase.id });

      const remaining = await getAllComments({ supertest, caseId: postedCase.id });
      expect(remaining.length).to.eql(0);
    });

    describe('rbac', () => {
      it('should delete all attachments when the user has the correct permissions', async () => {
        const caseInfo: Case = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        for (const user of [superUser, secOnly]) {
          await createComment({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: postCommentUserReq,
            auth: superUserSpace1Auth,
          });

          await deleteAllAttachmentsV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            auth: { user, space: 'space1' },
          });

          const remaining = await getAllComments({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            auth: superUserSpace1Auth,
          });
          expect(remaining.length).to.eql(0);
        }
      });

      it('should not delete all attachments when the user does not have correct permissions', async () => {
        const caseInfo: Case = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        const patchedCase = await createComment({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          params: postCommentUserReq,
          auth: superUserSpace1Auth,
        });
        const attachmentId = patchedCase.comments![0].id;

        for (const user of [noKibanaPrivileges, obsOnly, obsOnlyRead, globalRead]) {
          await deleteAllAttachmentsV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        }

        const remaining = await getAllComments({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          auth: superUserSpace1Auth,
        });
        expect(remaining.length).to.eql(1);
        expect(remaining[0].id).to.eql(attachmentId);
      });
    });
  });
};
