/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';
import {
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  createCase,
  createComment,
  deleteAttachmentV2,
  getAuthWithSuperUser,
} from '../../../../common/lib/api';

export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('delete_attachment', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    it('should delete an attachment from space1', async () => {
      const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, authSpace1);
      const patchedCase = await createComment({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: postCommentUserReq,
        auth: authSpace1,
      });

      const res = await deleteAttachmentV2({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        attachmentId: patchedCase.comments![0].id,
        auth: authSpace1,
      });

      expect(res).to.eql({});
    });

    it('should not delete an attachment from a different space', async () => {
      const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, authSpace1);
      const patchedCase = await createComment({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: postCommentUserReq,
        auth: authSpace1,
      });

      await deleteAttachmentV2({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        attachmentId: patchedCase.comments![0].id,
        expectedHttpCode: 404,
        auth: getAuthWithSuperUser('space2'),
      });
    });
  });
};
