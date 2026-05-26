/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import {
  COMMENT_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
  OSQUERY_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common/constants';
import type { AttachmentRequestV2 } from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { postCaseReq, postCommentUserReq } from '../../../common/lib/mock';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  bulkCreateAttachments,
  bulkGetAttachments,
  getCase,
} from '../../../common/lib/api';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('Mixed Legacy + Unified Reads', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('coexistence of legacy and unified attachments', () => {
      it('reflects both legacy v1 and unified v2 comments in case totalComment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        // Create a unified comment via the v2 bulk API
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'comment' as const,
              data: { content: 'unified comment' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        // Create a second unified comment
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'comment' as const,
              data: { content: 'another unified comment' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        const refreshedCase = await getCase({
          supertest,
          caseId: postedCase.id,
        });

        expect(refreshedCase.totalComment).to.be(2);
      });

      it('counts events and comments in case totals', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        // Create unified comment
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'comment' as const,
              data: { content: 'a comment' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        // Create unified event
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.event' as const,
              attachmentId: 'mixed-event-1',
              metadata: { index: 'test-events-index' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        const refreshedCase = await getCase({
          supertest,
          caseId: postedCase.id,
        });

        const totalAttachments =
          (refreshedCase.totalComment ?? 0) + (refreshedCase.totalEvents ?? 0);
        expect(totalAttachments).to.be.greaterThan(0);
      });

      it('bulk get retrieves attachments from both SO types', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        // Create a legacy v1 comment
        const legacyCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
        });
        const legacyId = legacyCase.comments![0].id;

        // Create a unified comment
        const unifiedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'comment' as const,
              data: { content: 'unified for bulk get' },
              owner: 'securitySolutionFixture',
            },
          ],
        });
        const unifiedId = unifiedCase.comments!.find((c) => c.id !== legacyId)!.id;

        const bulkResult = await bulkGetAttachments({
          supertest,
          caseId: postedCase.id,
          savedObjectIds: [legacyId, unifiedId],
        });

        expect(bulkResult.attachments.length).to.be(2);
        const ids = bulkResult.attachments.map((a: { id: string }) => a.id);
        expect(ids).to.contain(legacyId);
        expect(ids).to.contain(unifiedId);
      });

      it('bulk get retrieves osquery alongside a legacy user comment from both SO indices', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        // Legacy v1 user comment lands in cases-comments.
        const legacyCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentUserReq,
        });
        const legacyId = legacyCase.comments![0].id;

        // Unified osquery lands in cases-attachments.
        const osqueryCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            type: OSQUERY_ATTACHMENT_TYPE,
            attachmentId: 'mixed-osquery-1',
            metadata: { agentIds: ['agent-mixed'], queryId: 'mixed-query' },
            owner: 'securitySolutionFixture',
          } as AttachmentRequestV2,
        });
        const osqueryId = osqueryCase.comments!.find((c) => c.id !== legacyId)!.id;

        const bulkResult = await bulkGetAttachments({
          supertest,
          caseId: postedCase.id,
          savedObjectIds: [legacyId, osqueryId],
        });

        expect(bulkResult.attachments.length).to.be(2);
        // The internal `bulkGetAttachments` route reads with `mode: 'unified'`, so a
        // legacy `user` SO from `cases-comments` is projected to the unified
        // `comment` shape and a unified `osquery` SO from `cases-attachments` is
        // returned in its native unified shape.
        const byId = new Map<string, { type: string; attachmentId?: string }>(
          bulkResult.attachments.map((a: { id: string; type: string; attachmentId?: string }) => [
            a.id,
            a,
          ])
        );
        expect(byId.get(legacyId)!.type).to.be(COMMENT_ATTACHMENT_TYPE);
        const osqueryAttachment = byId.get(osqueryId)!;
        expect(osqueryAttachment.type).to.be(OSQUERY_ATTACHMENT_TYPE);
        expect(osqueryAttachment.attachmentId).to.be('mixed-osquery-1');
      });

      it('handles mixed legacy v1 and unified v2 payloads in bulk create', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: AttachmentType.user,
              comment: 'legacy v1 style comment',
              owner: 'securitySolutionFixture',
            },
            {
              type: 'comment' as const,
              data: { content: 'unified v2 style comment' },
              owner: 'securitySolutionFixture',
            },
            {
              type: LENS_ATTACHMENT_TYPE,
              data: { state: { attributes: { title: 'mixed test viz' } } },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        expect(updatedCase.comments?.length).to.be(3);
      });
    });
  });
};
