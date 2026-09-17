/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { postCaseReq, postCommentUserReq, getPostCaseRequest } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  createComment,
  getAttachmentV2,
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

  describe('get_attachment', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should get an attachment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });
      const attachment = await getAttachmentV2({
        supertest,
        caseId: postedCase.id,
        attachmentId: patchedCase.comments![0].id,
      });

      expect(attachment.id).to.eql(patchedCase.comments![0].id);
      expect(attachment.type).to.eql('comment');
      expect((attachment as unknown as { data: { content: string } }).data.content).to.eql(
        postCommentUserReq.comment
      );
    });

    it('unhappy path - 404s when attachment is not there', async () => {
      await getAttachmentV2({
        supertest,
        caseId: 'fake-id',
        attachmentId: 'fake-id',
        expectedHttpCode: 404,
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('should get an attachment when the user has the correct permissions', async () => {
        const caseInfo = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        const caseWithComment = await createComment({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          params: postCommentUserReq,
          auth: superUserSpace1Auth,
        });

        for (const user of [globalRead, superUser, secOnly, secOnlyRead, obsSec, obsSecRead]) {
          await getAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            attachmentId: caseWithComment.comments![0].id,
            auth: { user, space: 'space1' },
          });
        }
      });

      it('should not get an attachment when the user does not have correct permissions', async () => {
        const caseInfo = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        const caseWithComment = await createComment({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          params: postCommentUserReq,
          auth: superUserSpace1Auth,
        });

        for (const user of [noKibanaPrivileges, obsOnly, obsOnlyRead]) {
          await getAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            attachmentId: caseWithComment.comments![0].id,
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        }
      });
    });
  });
};
