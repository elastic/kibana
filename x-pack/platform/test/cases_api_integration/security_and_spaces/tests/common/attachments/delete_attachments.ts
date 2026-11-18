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
  getPostCaseRequest,
  getUnifiedFilesAttachmentReq,
  postCaseReq,
  postCommentUserReq,
} from '../../../../common/lib/mock';
import {
  bulkCreateAttachments,
  createAndUploadFile,
  deleteAllCaseItems,
  deleteAllFiles,
  createCase,
  createComment,
  deleteAllAttachmentsV2,
  getAllComments,
  listFiles,
  seedOwnerlessAttachment,
  superUserSpace1Auth,
  unifiedAttachmentExists,
} from '../../../../common/lib/api';
import { SECURITY_SOLUTION_FILE_KIND } from '../../../../common/lib/constants';
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
      await deleteAllFiles({ supertest });
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

    it('deletes the files of the file attachments', async () => {
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({ owner: 'securitySolution' })
      );

      const { create } = await createAndUploadFile({
        supertest,
        createFileParams: {
          name: 'testfile',
          kind: SECURITY_SOLUTION_FILE_KIND,
          mimeType: 'text/plain',
          meta: { caseIds: [postedCase.id], owner: [postedCase.owner] },
        },
        data: 'abc',
      });

      await bulkCreateAttachments({
        supertest,
        caseId: postedCase.id,
        params: [
          getUnifiedFilesAttachmentReq({ attachmentId: create.file.id, owner: 'securitySolution' }),
        ],
      });

      await deleteAllAttachmentsV2({ supertest, caseId: postedCase.id });

      const files = await listFiles({ supertest, params: { kind: SECURITY_SOLUTION_FILE_KIND } });
      expect(files.total).to.be(0);
    });

    it('deletes an attachment with no stored owner along with the rest', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment({ supertest, caseId: postedCase.id, params: postCommentUserReq });
      const attachmentId = await seedOwnerlessAttachment({ es, caseId: postedCase.id });

      await deleteAllAttachmentsV2({ supertest, caseId: postedCase.id });

      expect(await unifiedAttachmentExists({ es, id: attachmentId })).to.be(false);
      expect((await getAllComments({ supertest, caseId: postedCase.id })).length).to.eql(0);
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

      it('authorizes an attachment with no stored owner on the case owner', async () => {
        const caseInfo: Case = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );
        const attachmentId = await seedOwnerlessAttachment({
          es,
          caseId: caseInfo.id,
          space: 'space1',
        });

        await deleteAllAttachmentsV2({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          auth: { user: obsOnly, space: 'space1' },
          expectedHttpCode: 403,
        });
        expect(await unifiedAttachmentExists({ es, id: attachmentId })).to.be(true);

        await deleteAllAttachmentsV2({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          auth: { user: secOnly, space: 'space1' },
        });
        expect(await unifiedAttachmentExists({ es, id: attachmentId })).to.be(false);
      });
    });
  });
};
