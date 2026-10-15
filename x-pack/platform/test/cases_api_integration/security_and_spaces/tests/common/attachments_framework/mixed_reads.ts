/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { Case } from '@kbn/cases-plugin/common/types/domain';
import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  COMMENT_ATTACHMENT_TYPE,
  LENS_ATTACHMENT_TYPE,
  OSQUERY_ATTACHMENT_TYPE,
  SECURITY_ENDPOINT_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common/constants';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import type { AttachmentRequestV2 } from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  postCaseReq,
  postCommentActionsReq,
  postCommentUserReq,
} from '../../../../common/lib/mock';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  bulkCreateAttachments,
  bulkGetAttachments,
  getCase,
} from '../../../../common/lib/api';

const EVENTS_INDEX = 'test-events-index';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  // Attaching an event requires the referenced document to actually exist (mget-backed
  // existence check), so tests must seed it first.
  const seedEvents = (ids: string[]) =>
    Promise.all(
      ids.map((id) =>
        es.index({
          index: EVENTS_INDEX,
          id,
          document: { '@timestamp': new Date().toISOString() },
          refresh: true,
        })
      )
    );

  describe('Mixed Legacy + Unified Reads', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
      await es.indices.delete({ index: EVENTS_INDEX, ignore_unavailable: true });
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
        await seedEvents(['mixed-event-1']);
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
          } as AttachmentRequestV2,
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
        // The internal `bulkGetAttachments` route reads with `mode: 'unified'`
        const byId = new Map<string, { type: string; attachmentId?: string }>(
          bulkResult.attachments.map((a: { id: string; type: string; attachmentId?: string }) => [
            a.id,
            a,
          ])
        );

        const unifiedProjected = byId.get(unifiedId)!;
        expect(unifiedProjected.type).to.be(SECURITY_ENDPOINT_ATTACHMENT_TYPE);
        expect(unifiedProjected.attachmentId).to.be('mixed-endpoint-1');

        // The actions-origin row carries the synthetic sentinel `attachmentId` so
        // its origin stays discoverable to log readers and downstream consumers.
        const actionsProjected = byId.get(actionsId)!;
        expect(actionsProjected.type).to.be(SECURITY_ENDPOINT_ATTACHMENT_TYPE);
        expect(actionsProjected.attachmentId).to.be('legacy-actions');
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

    describe('cross-type stats and documents over a mixed case', () => {
      it('reports correct totals and retrieves every attachment across both SOs', async () => {
        await seedEvents(['stats-event-1']);
        const postedCase = await createCase(supertest, postCaseReq);

        // Track ids as they appear — each response returns the full comment list.
        const seen = new Set<string>();
        const nextId = (c: Case): string => {
          const id = c.comments!.find((cm) => !seen.has(cm.id))!.id;
          seen.add(id);
          return id;
        };

        // v1 user comment (cases-comments).
        const userId = nextId(
          await createComment({ supertest, caseId: postedCase.id, params: postCommentUserReq })
        );
        // v2 comment (cases-attachments).
        const commentId = nextId(
          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [
              {
                type: COMMENT_ATTACHMENT_TYPE,
                data: { content: 'unified comment' },
                owner: 'securitySolutionFixture',
              },
            ],
          })
        );
        // v2 event (cases-attachments).
        const eventId = nextId(
          await bulkCreateAttachments({
            supertest,
            caseId: postedCase.id,
            params: [
              {
                type: 'security.event' as const,
                attachmentId: 'stats-event-1',
                metadata: { index: 'test-events-index' },
                owner: 'securitySolutionFixture',
              },
            ],
          })
        );
        // v1 actions (folded to security.endpoint on cases-attachments).
        const actionsId = nextId(
          await createComment({ supertest, caseId: postedCase.id, params: postCommentActionsReq })
        );
        // v2 endpoint (cases-attachments).
        const endpointId = nextId(
          await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              type: SECURITY_ENDPOINT_ATTACHMENT_TYPE,
              attachmentId: 'stats-endpoint-1',
              owner: 'securitySolutionFixture',
              data: { content: 'isolated' },
              metadata: {
                command: 'isolate',
                targets: [{ endpointId: 'endpoint-1', hostname: 'host-1', agentType: 'endpoint' }],
              },
            } as AttachmentRequestV2,
          })
        );

        const refreshedCase = await getCase({ supertest, caseId: postedCase.id });
        // Only user + unified comment count as comments; only the event counts as an event.
        expect(refreshedCase.totalComment).to.be(2);
        expect(refreshedCase.totalEvents).to.be(1);

        const allIds = [userId, commentId, eventId, actionsId, endpointId];
        const bulkResult = await bulkGetAttachments({
          supertest,
          caseId: postedCase.id,
          savedObjectIds: allIds,
        });
        expect(bulkResult.attachments.length).to.be(5);
        const retrievedIds = bulkResult.attachments.map((a: { id: string }) => a.id);
        allIds.forEach((id) => expect(retrievedIds).to.contain(id));
      });
    });

    describe('migration window: unified-only row read via the always-on dual fetch', () => {
      it('surfaces a raw cases-attachments comment through getCase and bulkGetAttachments', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        // Seed a unified row directly into cases-attachments to emulate an
        // attachment written in the FF-ON config being read back through the
        // always-span-both-SOs read path (post-#275225).
        const seededId = 'unified-seeded-comment';
        await es.index({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          id: `${CASE_ATTACHMENT_SAVED_OBJECT}:${seededId}`,
          refresh: 'wait_for',
          document: {
            type: CASE_ATTACHMENT_SAVED_OBJECT,
            [CASE_ATTACHMENT_SAVED_OBJECT]: {
              type: COMMENT_ATTACHMENT_TYPE,
              owner: 'securitySolutionFixture',
              data: { content: 'seeded unified comment' },
              created_at: '2024-01-01T00:00:00.000Z',
              created_by: { username: 'elastic', full_name: null, email: null },
              pushed_at: null,
              pushed_by: null,
              updated_at: null,
              updated_by: null,
            },
            references: [{ type: 'cases', id: postedCase.id, name: 'associated-cases' }],
            namespaces: ['default'],
            updated_at: '2024-01-01T00:00:00.000Z',
            coreMigrationVersion: '8.8.0',
          },
        });

        const refreshedCase = await getCase({ supertest, caseId: postedCase.id });
        expect(refreshedCase.totalComment).to.be(1);

        const bulkResult = await bulkGetAttachments({
          supertest,
          caseId: postedCase.id,
          savedObjectIds: [seededId],
        });
        expect(bulkResult.attachments.length).to.be(1);
        expect(bulkResult.attachments[0].id).to.be(seededId);
      });
    });
  });
};
