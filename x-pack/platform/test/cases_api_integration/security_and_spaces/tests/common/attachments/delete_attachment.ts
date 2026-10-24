/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Case } from '@kbn/cases-plugin/common/types/domain';
import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
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
  deleteAttachmentV2,
  getAllComments,
  getAttachmentV2,
  listFiles,
  seedLegacyCommentAttachment,
  seedOwnerlessAttachment,
  seedUnreadableAttachment,
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
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  describe('delete_attachment', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
      await deleteAllFiles({ supertest });
    });

    it('deletes a file attachment together with its file', async () => {
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

      const caseWithFile = await bulkCreateAttachments({
        supertest,
        caseId: postedCase.id,
        params: [
          getUnifiedFilesAttachmentReq({ attachmentId: create.file.id, owner: 'securitySolution' }),
        ],
      });

      await deleteAttachmentV2({
        supertest,
        caseId: postedCase.id,
        attachmentId: caseWithFile.comments![0].id,
      });

      const files = await listFiles({ supertest, params: { kind: SECURITY_SOLUTION_FILE_KIND } });
      expect(files.total).to.be(0);
    });

    it('keeps a file linked to another case and still deletes its attachment', async () => {
      const [postedCase, otherCase] = await Promise.all([
        createCase(supertest, getPostCaseRequest({ owner: 'securitySolution' })),
        createCase(supertest, getPostCaseRequest({ owner: 'securitySolution' })),
      ]);

      const { create } = await createAndUploadFile({
        supertest,
        createFileParams: {
          name: 'testfile',
          kind: SECURITY_SOLUTION_FILE_KIND,
          mimeType: 'text/plain',
          meta: { caseIds: [postedCase.id, otherCase.id], owner: [postedCase.owner] },
        },
        data: 'abc',
      });

      const caseWithFile = await bulkCreateAttachments({
        supertest,
        caseId: postedCase.id,
        params: [
          getUnifiedFilesAttachmentReq({ attachmentId: create.file.id, owner: 'securitySolution' }),
        ],
      });

      await deleteAttachmentV2({
        supertest,
        caseId: postedCase.id,
        attachmentId: caseWithFile.comments![0].id,
      });

      expect(await getAllComments({ supertest, caseId: postedCase.id })).to.be.empty();
      const files = await listFiles({ supertest, params: { kind: SECURITY_SOLUTION_FILE_KIND } });
      expect(files.files.map(({ id }) => id)).to.eql([create.file.id]);
    });

    it('deletes an attachment with no stored owner', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const attachmentId = await seedOwnerlessAttachment({ es, caseId: postedCase.id });

      await deleteAttachmentV2({ supertest, caseId: postedCase.id, attachmentId });

      expect(await unifiedAttachmentExists({ es, id: attachmentId })).to.be(false);
    });

    it('deletes an attachment that cannot be read', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const attachmentId = await seedUnreadableAttachment({ es, caseId: postedCase.id });

      await deleteAttachmentV2({ supertest, caseId: postedCase.id, attachmentId });

      expect(await unifiedAttachmentExists({ es, id: attachmentId })).to.be(false);
    });

    it('deletes a leftover cases-comments attachment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const attachmentId = await seedLegacyCommentAttachment({
        es,
        caseId: postedCase.id,
        attributes: {
          type: AttachmentType.user,
          comment: 'leftover comment',
          owner: 'securitySolutionFixture',
        },
      });

      await deleteAttachmentV2({ supertest, caseId: postedCase.id, attachmentId });

      await getAttachmentV2({
        supertest,
        caseId: postedCase.id,
        attachmentId,
        expectedHttpCode: 404,
      });
    });

    describe('unhappy path', () => {
      it('404s when attachment belongs to a different case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
        });
        const attachmentId = patchedCase.comments![0].id;

        const error = (await deleteAttachmentV2({
          supertest,
          caseId: 'fake-id',
          attachmentId,
          expectedHttpCode: 404,
        })) as Error;

        expect(error.message).to.be(`This comment ${attachmentId} does not exist in fake-id.`);
      });

      it('404s when attachment is not there', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await deleteAttachmentV2({
          supertest,
          caseId: postedCase.id,
          attachmentId: 'fake-id',
          expectedHttpCode: 404,
        });
      });
    });

    describe('rbac', () => {
      it('should delete an attachment when the user has the correct permissions', async () => {
        for (const user of [superUser, secOnly]) {
          const caseInfo: Case = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            superUserSpace1Auth
          );

          const withFirst = await createComment({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: postCommentUserReq,
            auth: superUserSpace1Auth,
          });
          const toDeleteId = withFirst.comments![0].id;
          const withSecond = await createComment({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            params: postCommentUserReq,
            auth: superUserSpace1Auth,
          });
          const toKeepId = withSecond.comments!.find((comment) => comment.id !== toDeleteId)!.id;

          await deleteAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            attachmentId: toDeleteId,
            auth: { user, space: 'space1' },
          });

          const remaining = await getAllComments({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            auth: superUserSpace1Auth,
          });
          expect(remaining.length).to.eql(1);
          expect(remaining[0].id).to.eql(toKeepId);
        }
      });

      it('should not delete an attachment when the user does not have correct permissions', async () => {
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
          await deleteAttachmentV2({
            supertest: supertestWithoutAuth,
            caseId: caseInfo.id,
            attachmentId,
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

        await deleteAttachmentV2({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          attachmentId,
          auth: { user: obsOnly, space: 'space1' },
          expectedHttpCode: 403,
        });
        expect(await unifiedAttachmentExists({ es, id: attachmentId })).to.be(true);

        await deleteAttachmentV2({
          supertest: supertestWithoutAuth,
          caseId: caseInfo.id,
          attachmentId,
          auth: { user: secOnly, space: 'space1' },
        });
        expect(await unifiedAttachmentExists({ es, id: attachmentId })).to.be(false);
      });
    });
  });
};
