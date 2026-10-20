/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { MAX_BULK_DELETE_ATTACHMENTS } from '@kbn/cases-plugin/common/constants';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

import {
  getPostCaseRequest,
  getUnifiedFilesAttachmentReq,
  postCaseReq,
  postCommentAlertReq,
  postCommentUserReq,
} from '../../../../common/lib/mock';
import {
  bulkCreateAttachments,
  bulkDeleteAttachments,
  createAndUploadFile,
  createCase,
  createComment,
  deleteAllCaseItems,
  deleteAllFiles,
  findCaseUserActions,
  getAllComments,
  getCase,
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
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('bulk_delete_attachments', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('deletes all of the requested attachments', async () => {
      const postedCase = await createCase(supertest, postCaseReq);

      let theCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });
      theCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentAlertReq,
      });

      const savedObjectIds = theCase.comments!.map((comment) => comment.id);
      expect(savedObjectIds.length).to.eql(2);

      await bulkDeleteAttachments({ supertest, caseId: postedCase.id, savedObjectIds });

      const comments = await getAllComments({ supertest, caseId: postedCase.id });
      expect(comments.length).to.eql(0);
    });

    it('records a delete user action for each deleted attachment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);

      let theCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });
      theCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentAlertReq,
      });

      const savedObjectIds = theCase.comments!.map((comment) => comment.id);

      await bulkDeleteAttachments({ supertest, caseId: postedCase.id, savedObjectIds });

      const { userActions } = await findCaseUserActions({ supertest, caseID: postedCase.id });
      const deletions = userActions.filter(
        (userAction) => userAction.type === 'comment' && userAction.action === 'delete'
      );

      expect(deletions.length).to.eql(2);
    });

    it('updates the case attachment totals', async () => {
      const postedCase = await createCase(supertest, postCaseReq);

      let theCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });
      theCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentAlertReq,
      });

      await bulkDeleteAttachments({
        supertest,
        caseId: postedCase.id,
        savedObjectIds: theCase.comments!.map((comment) => comment.id),
      });

      const updatedCase = await getCase({ supertest, caseId: postedCase.id });

      expect(updatedCase.totalComment).to.eql(0);
      expect(updatedCase.totalAlerts).to.eql(0);
    });

    describe('file attachments', () => {
      afterEach(async () => {
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
            getUnifiedFilesAttachmentReq({
              attachmentId: create.file.id,
              owner: 'securitySolution',
            }),
          ],
        });

        await bulkDeleteAttachments({
          supertest,
          caseId: postedCase.id,
          savedObjectIds: [caseWithFile.comments![0].id],
        });

        const comments = await getAllComments({ supertest, caseId: postedCase.id });
        const files = await listFiles({ supertest, params: { kind: SECURITY_SOLUTION_FILE_KIND } });

        expect(comments.length).to.eql(0);
        expect(files.total).to.be(0);
      });

      it('deletes a file attachment whose file does not exist', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        const caseWithFile = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [getUnifiedFilesAttachmentReq()],
        });

        await bulkDeleteAttachments({
          supertest,
          caseId: postedCase.id,
          savedObjectIds: [caseWithFile.comments![0].id],
        });

        const comments = await getAllComments({ supertest, caseId: postedCase.id });
        expect(comments.length).to.eql(0);
      });
    });

    it('deletes an attachment with no stored owner', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const theCase = await createComment({
        supertest,
        caseId: postedCase.id,
        params: postCommentUserReq,
      });
      const ownerlessId = await seedOwnerlessAttachment({ es, caseId: postedCase.id });

      await bulkDeleteAttachments({
        supertest,
        caseId: postedCase.id,
        savedObjectIds: [theCase.comments![0].id, ownerlessId],
      });

      expect(await unifiedAttachmentExists({ es, id: ownerlessId })).to.be(false);
      expect((await getAllComments({ supertest, caseId: postedCase.id })).length).to.eql(0);
    });

    describe('errors', () => {
      it('returns a 404 and deletes nothing when one of the ids does not exist', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const theCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
        });

        await bulkDeleteAttachments({
          supertest,
          caseId: postedCase.id,
          savedObjectIds: [theCase.comments![0].id, 'does-not-exist'],
          expectedHttpCode: 404,
        });

        const comments = await getAllComments({ supertest, caseId: postedCase.id });
        expect(comments.length).to.eql(1);
      });

      it('returns a 404 and deletes nothing when an id belongs to another case', async () => {
        const firstCase = await createCase(supertest, postCaseReq);
        const secondCase = await createCase(supertest, postCaseReq);

        const firstCaseWithComment = await createComment({
          supertest,
          caseId: firstCase.id,
          params: postCommentUserReq,
        });
        const secondCaseWithComment = await createComment({
          supertest,
          caseId: secondCase.id,
          params: postCommentUserReq,
        });

        await bulkDeleteAttachments({
          supertest,
          caseId: firstCase.id,
          savedObjectIds: [
            firstCaseWithComment.comments![0].id,
            secondCaseWithComment.comments![0].id,
          ],
          expectedHttpCode: 404,
        });

        expect((await getAllComments({ supertest, caseId: firstCase.id })).length).to.eql(1);
        expect((await getAllComments({ supertest, caseId: secondCase.id })).length).to.eql(1);
      });

      it('returns a 400 when the ids are empty', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await bulkDeleteAttachments({
          supertest,
          caseId: postedCase.id,
          savedObjectIds: [],
          expectedHttpCode: 400,
        });
      });

      it(`returns a 400 when deleting more than ${MAX_BULK_DELETE_ATTACHMENTS} attachments`, async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await bulkDeleteAttachments({
          supertest,
          caseId: postedCase.id,
          savedObjectIds: new Array(MAX_BULK_DELETE_ATTACHMENTS + 1)
            .fill('id')
            .map((id, index) => `${id}-${index}`),
          expectedHttpCode: 400,
        });
      });
    });

    describe('rbac', () => {
      const supertestWithoutAuth = getService('supertestWithoutAuth');

      it('deletes the attachments a user has access to', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        const theCase = await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: superUserSpace1Auth,
        });

        await bulkDeleteAttachments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          savedObjectIds: [theCase.comments![0].id],
          auth: { user: secOnly, space: 'space1' },
        });

        const comments = await getAllComments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          auth: { user: superUser, space: 'space1' },
        });

        expect(comments.length).to.eql(0);
      });

      it('does not delete an attachment with an owner the user cannot access', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        const theCase = await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: superUserSpace1Auth,
        });

        await bulkDeleteAttachments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          savedObjectIds: [theCase.comments![0].id],
          auth: { user: obsOnly, space: 'space1' },
          expectedHttpCode: 403,
        });

        const comments = await getAllComments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          auth: { user: superUser, space: 'space1' },
        });

        expect(comments.length).to.eql(1);
      });

      it('authorizes an attachment with no stored owner on the case owner', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );
        const ownerlessId = await seedOwnerlessAttachment({
          es,
          caseId: postedCase.id,
          space: 'space1',
        });

        await bulkDeleteAttachments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          savedObjectIds: [ownerlessId],
          auth: { user: obsOnly, space: 'space1' },
          expectedHttpCode: 403,
        });
        expect(await unifiedAttachmentExists({ es, id: ownerlessId })).to.be(true);

        await bulkDeleteAttachments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          savedObjectIds: [ownerlessId],
          auth: { user: secOnly, space: 'space1' },
        });
        expect(await unifiedAttachmentExists({ es, id: ownerlessId })).to.be(false);
      });

      for (const user of [globalRead, secOnlyRead, noKibanaPrivileges]) {
        it(`User ${
          user.username
        } with role(s) ${user.roles.join()} - should NOT bulk delete attachments`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            superUserSpace1Auth
          );

          const theCase = await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: postCommentUserReq,
            auth: superUserSpace1Auth,
          });

          await bulkDeleteAttachments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            savedObjectIds: [theCase.comments![0].id],
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
      }

      it('does not delete attachments in a space the user does not have access to', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          superUserSpace1Auth
        );

        const theCase = await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: superUserSpace1Auth,
        });

        await bulkDeleteAttachments({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          savedObjectIds: [theCase.comments![0].id],
          auth: { user: secOnly, space: 'space2' },
          expectedHttpCode: 403,
        });
      });
    });
  });
};
