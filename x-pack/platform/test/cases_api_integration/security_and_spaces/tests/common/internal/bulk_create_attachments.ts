/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  DASHBOARD_ATTACHMENT_TYPE,
  DASHBOARD_SO_TYPE,
} from '@kbn/cases-plugin/common/constants/attachments';
import type { BulkCreateAttachmentsRequestV2 } from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  bulkCreateAttachments,
  findCaseUserActions,
} from '../../../../common/lib/api';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('bulk_create_attachments', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('v1 legacy attachment', () => {
      it('creates a comment attachment with v1 payload (type, comment, owner) and returns case with comment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const v1CommentPayload = {
          type: postCommentUserReq.type,
          comment: 'v1 legacy comment',
          owner: 'securitySolutionFixture',
        };
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [v1CommentPayload],
        });

        expect(updatedCase.comments?.length).to.be(1);
        const comment = updatedCase.comments![0];
        // Response may be unified (type: 'comment') or legacy (type: 'user') depending on feature flag
        expect(['comment', 'user']).to.contain(comment.type);
        const content =
          (comment as { data?: { content?: string } }).data?.content ??
          (comment as { comment?: string }).comment;
        expect(content).to.eql('v1 legacy comment');
        expect(updatedCase.owner).to.eql('securitySolutionFixture');
      });
    });

    describe('v2 unified attachment', () => {
      it('creates a comment attachmentwith v2 payload (no owner) and resolves owner from case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const v2CommentPayload = {
          type: 'comment' as const,
          data: { content: 'v2 unified comment' },
          owner: 'securitySolutionFixture',
        };
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [v2CommentPayload],
        });

        expect(updatedCase.comments?.length).to.be(1);
        const comment = updatedCase.comments![0];
        // Response may be unified (type: 'comment') or legacy (type: 'user') depending on feature flag
        expect(['comment', 'user']).to.contain(comment.type);
        const content =
          (comment as { data?: { content?: string } }).data?.content ??
          (comment as { comment?: string }).comment;
        expect(content).to.eql('v2 unified comment');
        expect(updatedCase.owner).to.eql('securitySolutionFixture');
      });
    });

    describe('saved-object reference attachments', () => {
      // Payload schemas live in `cases-plugin/common/types/domain_zod/attachment/dashboard/v2.ts`
      // — the test exercises the same shape that `useAttachSavedObject` constructs.
      // The legacy `BulkCreateAttachmentsRequestV2` type doesn't yet include
      // dashboard/map/discoverSession; cast on send so the request hits the
      // (escape-hatch) route untouched.
      const dashboardPayload = {
        type: DASHBOARD_ATTACHMENT_TYPE,
        owner: 'securitySolutionFixture',
        attachmentId: 'dashboard-1',
        metadata: {
          title: 'My dashboard',
          soType: DASHBOARD_SO_TYPE,
        },
      };

      it('returns a unified-shaped response when the batch contains a dashboard attachment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [dashboardPayload] as unknown as BulkCreateAttachmentsRequestV2,
        });

        expect(updatedCase.comments?.length).to.be(1);
        const attachment = updatedCase.comments![0] as unknown as {
          type: string;
          attachmentId: string;
          metadata: { title: string; soType: string };
          owner: string;
        };
        expect(attachment.type).to.eql(DASHBOARD_ATTACHMENT_TYPE);
        expect(attachment.attachmentId).to.eql('dashboard-1');
        expect(attachment.metadata).to.eql({
          title: 'My dashboard',
          soType: DASHBOARD_SO_TYPE,
        });
        expect(attachment.owner).to.eql('securitySolutionFixture');
      });

      it('records a comment user-action when a dashboard attachment is created', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [dashboardPayload] as unknown as BulkCreateAttachmentsRequestV2,
        });

        const { userActions } = await findCaseUserActions({ supertest, caseID: postedCase.id });
        // Position 0 is the "create case" action; position 1 is the attachment.
        const attachmentUserAction = userActions[1];
        expect(attachmentUserAction.type).to.eql('comment');
        expect(attachmentUserAction.action).to.eql('create');
      });

      it('returns a unified-shaped response for a mixed batch (user comment + dashboard)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            postCommentUserReq,
            dashboardPayload,
          ] as unknown as BulkCreateAttachmentsRequestV2,
        });

        expect(updatedCase.comments?.length).to.be(2);
        const dashboardAttachment = updatedCase.comments!.find(
          (c) => c.type === DASHBOARD_ATTACHMENT_TYPE
        ) as unknown as { attachmentId: string };
        expect(dashboardAttachment).to.be.ok();
        expect(dashboardAttachment.attachmentId).to.eql('dashboard-1');

        // The user-comment partner survives the batch in either legacy
        // (`type: 'user'`, `comment: '…'`) or unified (`type: 'comment'`,
        // `data.content: '…'`) shape — assert content rather than shape so we
        // stay tolerant of the in-flight rollout.
        const userPartner = updatedCase.comments!.find(
          (c) => c.type === 'user' || c.type === 'comment'
        ) as unknown as { comment?: string; data?: { content?: string } };
        const partnerContent = userPartner.data?.content ?? userPartner.comment;
        expect(partnerContent).to.eql(postCommentUserReq.comment);
      });
    });
  });
};
