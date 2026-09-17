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
  deleteAllCaseItems,
  createCase,
  createComment,
  getAttachmentV2,
  getAuthWithSuperUser,
} from '../../../../common/lib/api';

export default ({ getService }: FtrProviderContext): void => {
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const authSpace1 = getAuthWithSuperUser();

  describe('get_attachment', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should get an attachment in space1', async () => {
      const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, authSpace1);
      const patchedCase = await createComment({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: postCommentUserReq,
        auth: authSpace1,
      });
      const attachment = await getAttachmentV2({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        attachmentId: patchedCase.comments![0].id,
        auth: authSpace1,
      });

      expect(attachment.id).to.eql(patchedCase.comments![0].id);
      expect(attachment.type).to.eql('comment');
      expect((attachment as unknown as { data: { content: string } }).data.content).to.eql(
        postCommentUserReq.comment
      );
    });

    it('should not get an attachment in space2 when it was created in space1', async () => {
      const postedCase = await createCase(supertestWithoutAuth, postCaseReq, 200, authSpace1);
      const patchedCase = await createComment({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        params: postCommentUserReq,
        auth: authSpace1,
      });
      await getAttachmentV2({
        supertest: supertestWithoutAuth,
        caseId: postedCase.id,
        attachmentId: patchedCase.comments![0].id,
        auth: getAuthWithSuperUser('space2'),
        expectedHttpCode: 404,
      });
    });
  });
};
