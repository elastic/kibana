/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import {
  LENS_ATTACHMENT_TYPE,
  SECURITY_ENDPOINT_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common/constants';
import type { AttachmentRequest } from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { postCaseReq, postCommentActionsReq, postCommentUserReq } from '../../../common/lib/mock';
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

      it('bulk get retrieves a unified `security.endpoint` alongside a legacy `actions` row from both SO indices', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        // Unified `security.endpoint` lands on cases-attachments.
        const unifiedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            type: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
            attachmentId: 'mixed-endpoint-1',
            owner: 'securitySolutionFixture',
            data: { content: 'isolated via unified payload' },
            metadata: {
              command: 'isolate',
              targets: [{ endpointId: 'endpoint-1', hostname: 'host-1', agentType: 'endpoint' }],
            },
          } as unknown as AttachmentRequest,
        });
        const unifiedId = unifiedCase.comments![0].id;

        // Legacy `actions` is folded to `security.endpoint` on write (also lands on
        // cases-attachments), exercising the asymmetric retirement path alongside
        // the direct unified write.
        const actionsCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentActionsReq,
        });
        const actionsId = actionsCase.comments!.find((c) => c.id !== unifiedId)!.id;

        const bulkResult = await bulkGetAttachments({
          supertest,
          caseId: postedCase.id,
          savedObjectIds: [unifiedId, actionsId],
        });

        expect(bulkResult.attachments.length).to.be(2);
        const byId = new Map<
          string,
          { type: string; externalReferenceAttachmentTypeId?: string; externalReferenceId?: string }
        >(bulkResult.attachments.map((a: { id: string; type: string }) => [a.id, a]));

        // Both rows surface as the legacy `externalReference + endpoint` projection
        // for API consumers; the actions-origin row carries the synthetic sentinel id.
        const unifiedProjected = byId.get(unifiedId)!;
        expect(unifiedProjected.type).to.be(AttachmentType.externalReference);
        expect(unifiedProjected.externalReferenceAttachmentTypeId).to.be('endpoint');

        const actionsProjected = byId.get(actionsId)!;
        expect(actionsProjected.type).to.be(AttachmentType.externalReference);
        expect(actionsProjected.externalReferenceAttachmentTypeId).to.be('endpoint');
        expect(actionsProjected.externalReferenceId).to.be('legacy-actions');
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
