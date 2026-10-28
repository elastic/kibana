/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { getPostCaseRequest, postCommentUserReq } from '../../../../common/lib/mock';
import {
  createComment,
  deleteCasesByESQuery,
  deleteCasesUserActions,
  deleteComments,
  findAttachmentsV2,
  createCase,
  getAuthWithSuperUser,
} from '../../../../common/lib/api';

export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('find_attachments', () => {
    afterEach(async () => {
      await deleteCasesByESQuery(es);
      await deleteComments(es);
      await deleteCasesUserActions(es);
    });

    it('should find all case attachments in space1', async () => {
      const caseInfo = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        authSpace1
      );
      await createComment({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        params: postCommentUserReq,
        auth: authSpace1,
      });

      const patchedCase = await createComment({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        params: postCommentUserReq,
        auth: authSpace1,
      });

      const attachments = await findAttachmentsV2({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        auth: authSpace1,
      });

      expect(attachments.data.map((a) => a.id).sort()).to.eql(
        patchedCase.comments!.map((c) => c.id).sort()
      );
    });

    it('should not find any case attachments in space2', async () => {
      const caseInfo = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        authSpace1
      );
      await createComment({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        params: postCommentUserReq,
        auth: authSpace1,
      });

      const attachments = await findAttachmentsV2({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        auth: getAuthWithSuperUser('space2'),
      });

      expect(attachments.data.length).to.eql(0);
    });

    it('filters by `type`', async () => {
      const caseInfo = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        authSpace1
      );
      await createComment({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        params: postCommentUserReq,
        auth: authSpace1,
      });

      const attachments = await findAttachmentsV2({
        supertest: supertestWithoutAuth,
        caseId: caseInfo.id,
        query: { type: 'security.alert' },
        auth: authSpace1,
      });

      expect(attachments.data.length).to.eql(0);
    });
  });
};
