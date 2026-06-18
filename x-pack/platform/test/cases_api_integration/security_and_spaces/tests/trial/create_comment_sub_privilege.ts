/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type {
  ExternalReferenceSOAttachmentPayload,
  UnifiedReferenceAttachmentPayload,
} from '@kbn/cases-plugin/common/types/domain';
import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import { SECURITY_ENTITY_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common/constants';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import {
  fileAttachmentMetadata,
  getFilesAttachmentReq,
  getPostCaseRequest,
  postCommentAlertMultipleIdsReq,
  postCommentEntityReq,
  postCommentUserReq,
} from '../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  createComment,
  updateComment,
  deleteAllComments,
  findCaseUserActions,
} from '../../../common/lib/api';
import {
  superUser,
  secOnly,
  obsOnly,
  secOnlyNoCreateComment,
  secOnlyReadCreateComment,
  secOnlyCreateComment,
} from '../../../common/lib/authentication/users';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  describe('createComment subprivilege', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('user comments', () => {
      it('should not create user comments', async () => {
        // No privileges
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: secOnlyNoCreateComment,
            space: 'space1',
          }
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: { user: secOnlyNoCreateComment, space: 'space1' },
          expectedHttpCode: 403,
        });
      });

      // Create
      for (const scenario of [
        { user: secOnlyReadCreateComment, space: 'space1' },
        { user: secOnlyCreateComment, space: 'space1' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should create user comments`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );
          await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: postCommentUserReq,
            auth: scenario,
            expectedHttpCode: 200,
          });
        });
      }

      // Update
      it('should update comment without createComment privileges', async () => {
        // Note: Not ideal behavior. A user unable to create should not be able to update,
        // but it is a concession until the privileges are properly broken apart.
        const commentUpdate = 'Heres an update because I do not want to make a new comment!';
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space1',
          }
        );
        const patchedCase = await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentUserReq,
          auth: { user: superUser, space: 'space1' },
        });

        const updatedCommentCase = await updateComment({
          supertest,
          caseId: postedCase.id,
          auth: { user: secOnlyNoCreateComment, space: 'space1' },
          req: {
            id: patchedCase.comments![0].id,
            version: patchedCase.comments![0].version,
            comment: commentUpdate,
            type: AttachmentType.user,
            owner: 'securitySolutionFixture',
          },
        });

        const { userActions } = await findCaseUserActions({
          supertest,
          caseID: postedCase.id,
          auth: { user: superUser, space: 'space1' },
        });
        const commentUserAction = userActions[2];

        expect(userActions.length).to.eql(3);
        expect(commentUserAction.type).to.eql('comment');
        expect(commentUserAction.action).to.eql('update');
        expect(commentUserAction.comment_id).to.eql(updatedCommentCase.comments![0].id);
        expect(commentUserAction.payload).to.eql({
          comment: {
            comment: commentUpdate,
            type: AttachmentType.user,
            owner: 'securitySolutionFixture',
          },
        });
      });

      // Update
      for (const scenario of [
        { user: secOnlyCreateComment, space: 'space1' },
        { user: secOnlyReadCreateComment, space: 'space1' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should not update user comments`, async () => {
          const commentUpdate = 'Heres an update because I do not want to make a new comment!';
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );
          const patchedCase = await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: postCommentUserReq,
            auth: { user: superUser, space: 'space1' },
          });

          await updateComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            auth: scenario,
            req: {
              id: patchedCase.comments![0].id,
              version: patchedCase.comments![0].version,
              comment: commentUpdate,
              type: AttachmentType.user,
              owner: 'securitySolutionFixture',
            },
            expectedHttpCode: 403,
          });
        });
      }
    });

    describe('alerts', () => {
      it('should not attach alerts to the case', async () => {
        // No privileges
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space1',
          }
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentAlertMultipleIdsReq,
          auth: { user: secOnlyNoCreateComment, space: 'space1' },
          expectedHttpCode: 403,
        });
      });

      // Create
      for (const scenario of [
        { user: secOnlyCreateComment, space: 'space1' },
        { user: secOnlyReadCreateComment, space: 'space1' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should attach alerts`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );
          await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: postCommentAlertMultipleIdsReq,
            auth: scenario,
            expectedHttpCode: 200,
          });
        });
      }

      // Delete
      for (const scenario of [
        { user: secOnlyNoCreateComment, space: 'space1' },
        { user: secOnlyCreateComment, space: 'space1' },
        { user: secOnlyReadCreateComment, space: 'space1' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should not delete attached alerts`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );

          await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: postCommentAlertMultipleIdsReq,
            auth: { user: superUser, space: 'space1' },
          });

          await deleteAllComments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            auth: scenario,
            expectedHttpCode: 403,
          });
        });
      }
    });

    describe('files', () => {
      it('should not attach files to the case', async () => {
        // No privileges
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space1',
          }
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          auth: { user: secOnlyNoCreateComment, space: 'space1' },
          params: getFilesAttachmentReq(),
          expectedHttpCode: 403,
        });
      });

      // Create
      for (const scenario of [
        { user: secOnlyCreateComment, space: 'space1' },
        { user: secOnlyReadCreateComment, space: 'space1' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should attach files`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );

          const caseWithAttachments = await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            auth: scenario,
            params: getFilesAttachmentReq(),
            expectedHttpCode: 200,
          });

          const fileAttachment =
            caseWithAttachments.comments![0] as ExternalReferenceSOAttachmentPayload;

          expect(caseWithAttachments.totalComment).to.be(1);
          expect(fileAttachment.externalReferenceMetadata).to.eql(fileAttachmentMetadata);
        });
      }

      // Delete
      for (const scenario of [
        { user: secOnlyCreateComment, space: 'space1' },
        { user: secOnlyReadCreateComment, space: 'space1' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should not delete attached files`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );

          await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            auth: { user: superUser, space: 'space1' },
            params: getFilesAttachmentReq(),
            expectedHttpCode: 200,
          });

          await deleteAllComments({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            auth: scenario,
            expectedHttpCode: 403,
          });
        });
      }
    });

    describe('entities', () => {
      it('should not attach an entity to the case', async () => {
        // No privileges
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: 'securitySolutionFixture' }),
          200,
          {
            user: superUser,
            space: 'space1',
          }
        );

        await createComment({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          params: postCommentEntityReq,
          auth: { user: secOnlyNoCreateComment, space: 'space1' },
          expectedHttpCode: 403,
        });
      });

      // Create
      for (const scenario of [
        { user: secOnlyCreateComment, space: 'space1' },
        { user: secOnlyReadCreateComment, space: 'space1' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should attach an entity`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );

          const caseWithAttachments = await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: postCommentEntityReq,
            auth: scenario,
            expectedHttpCode: 200,
          });

          expect(caseWithAttachments.totalComment).to.be(1);
        });
      }

      describe('owner authorization', () => {
        it('should not attach an entity when the user does not have permissions for that owner', async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'observabilityFixture' }),
            200,
            { user: obsOnly, space: 'space1' }
          );

          await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: { ...postCommentEntityReq, owner: 'observabilityFixture' },
            auth: { user: secOnly, space: 'space1' },
            expectedHttpCode: 403,
          });
        });

        it('should attach an entity when the user has permissions for that owner', async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            { user: secOnly, space: 'space1' }
          );

          await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: postCommentEntityReq,
            auth: { user: secOnly, space: 'space1' },
            expectedHttpCode: 200,
          });
        });
      });

      describe('schema validation', () => {
        it('should reject an entity payload with an extra field without leaking schema internals', async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: 'securitySolutionFixture' }),
            200,
            {
              user: superUser,
              space: 'space1',
            }
          );

          const response = (await createComment({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            params: {
              ...postCommentEntityReq,
              metadata: {
                ...postCommentEntityReq.metadata,
                extraField: 'not-allowed',
              },
            } as UnifiedReferenceAttachmentPayload,
            auth: { user: superUser, space: 'space1' },
            expectedHttpCode: 400,
          })) as unknown as {
            statusCode: number;
            error: string;
            message: string;
            stack?: string;
          };

          expect(response.statusCode).to.be(400);
          expect(response.error).to.be('Bad Request');
          expect(response.message).to.contain(
            `Invalid attachment payload for type '${SECURITY_ENTITY_ATTACHMENT_TYPE}'`
          );
          // The error must be a human-readable summary, not a raw zod/schema dump.
          expect(response.message).not.to.contain('ZodError');
          expect(response.stack).to.be(undefined);
        });
      });
    });
  });
};
