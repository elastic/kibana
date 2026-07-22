/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
} from '@kbn/cases-plugin/common/constants';
import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import type { AttachmentRequest } from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCaseReq } from '../../../../common/lib/mock';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  bulkCreateAttachments,
  getComment,
  deleteComment,
  getCase,
} from '../../../../common/lib/api';

/**
 * Legacy v1 `event` payload. With the flag ON the owner prefix resolves it to a
 * unified `security.event`, but it is written through the legacy path so it lands
 * on the legacy `cases-comments` SO (mirrors the legacy-alert behavior).
 */
const legacyEventPayload = (overrides: Record<string, unknown> = {}): AttachmentRequest =>
  ({
    type: AttachmentType.event,
    eventId: 'legacy-event-1',
    index: 'legacy-events-index',
    owner: 'securitySolutionFixture',
    ...overrides,
  } as AttachmentRequest);

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('Unified Events — CRUD, aggregation, stats', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('create', () => {
      it('creates a unified event attachment via v2 payload', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.event' as const,
              attachmentId: 'event-doc-1',
              metadata: { index: 'test-events-index' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        expect(updatedCase.comments?.length).to.be(1);

        const event = updatedCase.comments![0];
        expect(['security.event', 'event']).to.contain(event.type);
      });

      it('writes event to cases-attachments SO when flag is ON', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.event' as const,
              attachmentId: 'event-so-check',
              metadata: { index: 'test-events-index' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        const eventId = updatedCase.comments![0].id;

        const unifiedSOs = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_ATTACHMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_ATTACHMENT_SAVED_OBJECT}:${eventId}` } },
              ],
            },
          },
        });

        expect(unifiedSOs.hits.hits.length).to.be(1);

        const legacySOs = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_COMMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_COMMENT_SAVED_OBJECT}:${eventId}` } },
              ],
            },
          },
        });

        expect(legacySOs.hits.hits.length).to.be(0);
      });

      it('creates event with array attachmentId', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.event' as const,
              attachmentId: ['event-1', 'event-2', 'event-3'],
              metadata: { index: 'test-events-index' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        expect(updatedCase.comments?.length).to.be(1);
        expect(updatedCase.totalEvents).to.be(3);
      });
    });

    describe('read', () => {
      it('retrieves a unified event by id', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.event' as const,
              attachmentId: 'event-read-1',
              metadata: { index: 'test-events-index' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        const eventId = updatedCase.comments![0].id;
        const fetched = await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: eventId,
        });

        expect(fetched.id).to.be(eventId);
        expect(['security.event', 'event']).to.contain(fetched.type);
      });

      it('reflects unified events in case totalEvents count', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.event' as const,
              attachmentId: 'event-find-1',
              metadata: { index: 'test-events-index' },
              owner: 'securitySolutionFixture',
            },
            {
              type: 'security.event' as const,
              attachmentId: 'event-find-2',
              metadata: { index: 'test-events-index' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        const refreshedCase = await getCase({
          supertest,
          caseId: postedCase.id,
        });

        expect(refreshedCase.totalEvents).to.be(2);
      });
    });

    describe('stats and aggregation', () => {
      it('totalEvents reflects unified event count on the case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.event' as const,
              attachmentId: 'stats-event-1',
              metadata: { index: 'test-events-index' },
              owner: 'securitySolutionFixture',
            },
            {
              type: 'security.event' as const,
              attachmentId: 'stats-event-2',
              metadata: { index: 'test-events-index' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        expect(updatedCase.totalEvents).to.be(2);

        const refreshedCase = await getCase({
          supertest,
          caseId: postedCase.id,
        });

        expect(refreshedCase.totalEvents).to.be(2);
      });

      it('counts comments and events in case totals', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'comment' as const,
              data: { content: 'a comment' },
              owner: 'securitySolutionFixture',
            },
            {
              type: 'security.event' as const,
              attachmentId: 'mixed-event-1',
              metadata: { index: 'test-events-index' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        expect(updatedCase.comments?.length).to.be(2);
        const totalAttachments = (updatedCase.totalComment ?? 0) + (updatedCase.totalEvents ?? 0);
        expect(totalAttachments).to.be.greaterThan(0);
      });
    });

    describe('mixed legacy + unified events on the same case', () => {
      it('projects a legacy `event` into the same v2-shaped read as a native v2 event', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const legacyCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: legacyEventPayload(),
        });
        const legacyId = legacyCase.comments![0].id;

        const fetched = await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: legacyId,
        });

        expect(['security.event', 'event']).to.contain(fetched.type);
      });

      it('routes a legacy `event` to cases-comments while a unified event lands in cases-attachments', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        const legacyCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: legacyEventPayload(),
        });
        const legacyId = legacyCase.comments![0].id;

        const unifiedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.event' as const,
              attachmentId: 'unified-event-mix',
              metadata: { index: 'test-events-index' },
              owner: 'securitySolutionFixture',
            },
          ],
        });
        const unifiedId = unifiedCase.comments!.find((c) => c.id !== legacyId)!.id;

        const legacyOnLegacySO = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_COMMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_COMMENT_SAVED_OBJECT}:${legacyId}` } },
              ],
            },
          },
        });
        expect(legacyOnLegacySO.hits.hits.length).to.be(1);

        const unifiedOnUnifiedSO = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_ATTACHMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_ATTACHMENT_SAVED_OBJECT}:${unifiedId}` } },
              ],
            },
          },
        });
        expect(unifiedOnUnifiedSO.hits.hits.length).to.be(1);
      });

      it('totalEvents equals the union of legacy and unified events', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        // One legacy event (cases-comments).
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: legacyEventPayload(),
        });

        // Two unified events (cases-attachments), one carrying a multi-id doc.
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.event' as const,
              attachmentId: 'union-event-1',
              metadata: { index: 'test-events-index' },
              owner: 'securitySolutionFixture',
            },
            {
              type: 'security.event' as const,
              attachmentId: ['union-event-2', 'union-event-3'],
              metadata: { index: 'test-events-index' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        const refreshedCase = await getCase({ supertest, caseId: postedCase.id });
        // 1 legacy + 1 single unified + 2 multi-id unified = 4 event docs total.
        expect(refreshedCase.totalEvents).to.be(4);
      });
    });

    describe('delete', () => {
      it('deletes a unified event', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.event' as const,
              attachmentId: 'event-delete-1',
              metadata: { index: 'test-events-index' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        const eventId = updatedCase.comments![0].id;
        await deleteComment({
          supertest,
          caseId: postedCase.id,
          commentId: eventId,
        });

        const refreshedCase = await getCase({
          supertest,
          caseId: postedCase.id,
        });

        expect(refreshedCase.totalEvents).to.be(0);
      });
    });
  });
};
