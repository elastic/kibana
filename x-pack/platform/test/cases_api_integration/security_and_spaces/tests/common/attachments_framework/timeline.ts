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
  SECURITY_TIMELINE_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common/constants';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import type {
  BulkCreateAttachmentsRequestV2,
  AttachmentRequestV2,
} from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';
import {
  bulkCreateAttachments,
  createCase,
  createComment,
  deleteAllCaseItems,
  getComment,
} from '../../../../common/lib/api';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  // `security.timeline` is a unified-only reference attachment (no legacy v1
  // equivalent) registered by the security_solution plugin. Its schema is
  // strict: `{ type, owner, attachmentId (min 1), metadata: { title } }`.
  const timelinePayload = {
    type: SECURITY_TIMELINE_ATTACHMENT_TYPE,
    owner: 'securitySolutionFixture',
    attachmentId: 'timeline-1',
    metadata: { title: 'My timeline' },
  };

  const searchSO = (id: string, soType: string) =>
    es.search({
      index: ALERTING_CASES_SAVED_OBJECT_INDEX,
      query: {
        bool: {
          must: [{ term: { type: soType } }, { term: { _id: `${soType}:${id}` } }],
        },
      },
    });

  describe('Timeline saved-object attachments', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('create', () => {
      it('returns a unified-shaped response and writes to cases-attachments', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: timelinePayload as unknown as AttachmentRequestV2,
        });

        const attachment = patchedCase.comments![0] as unknown as {
          id: string;
          type: string;
          attachmentId: string;
          metadata: { title: string };
          owner: string;
        };
        expect(attachment.type).to.eql(SECURITY_TIMELINE_ATTACHMENT_TYPE);
        expect(attachment.attachmentId).to.eql('timeline-1');
        expect(attachment.metadata).to.eql({ title: 'My timeline' });
        expect(attachment.owner).to.eql('securitySolutionFixture');

        const unifiedSOs = await searchSO(attachment.id, CASE_ATTACHMENT_SAVED_OBJECT);
        expect(unifiedSOs.hits.hits.length).to.be(1);
        expect(
          (unifiedSOs.hits.hits[0]._source as { 'cases-attachments': { type: string } })[
            CASE_ATTACHMENT_SAVED_OBJECT
          ].type
        ).to.be(SECURITY_TIMELINE_ATTACHMENT_TYPE);

        const legacySOs = await searchSO(attachment.id, CASE_COMMENT_SAVED_OBJECT);
        expect(legacySOs.hits.hits.length).to.be(0);
      });

      it('returns a unified-shaped response for a mixed batch (user comment + timeline)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            postCommentUserReq,
            timelinePayload,
          ] as unknown as BulkCreateAttachmentsRequestV2,
        });

        expect(updatedCase.comments?.length).to.be(2);
        const timeline = updatedCase.comments!.find(
          (comment) => comment.type === SECURITY_TIMELINE_ATTACHMENT_TYPE
        ) as unknown as { attachmentId: string };
        expect(timeline).to.be.ok();
        expect(timeline.attachmentId).to.eql('timeline-1');
      });
    });

    describe('read', () => {
      it('keeps the unified shape on GET /:caseId/comments/:commentId (no legacy projection)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const patchedCase = await createComment({
          supertest,
          caseId: postedCase.id,
          params: timelinePayload as unknown as AttachmentRequestV2,
        });
        const created = patchedCase.comments![0];

        const fetched = (await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: created.id,
        })) as unknown as {
          id: string;
          type: string;
          attachmentId: string;
          metadata: { title: string };
        };

        expect(fetched.id).to.be(created.id);
        expect(fetched.type).to.be(SECURITY_TIMELINE_ATTACHMENT_TYPE);
        expect(fetched.attachmentId).to.be('timeline-1');
        expect(fetched.metadata).to.eql({ title: 'My timeline' });
      });
    });

    describe('schema validation', () => {
      it('rejects a payload missing metadata.title', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            type: SECURITY_TIMELINE_ATTACHMENT_TYPE,
            owner: 'securitySolutionFixture',
            attachmentId: 'timeline-1',
            metadata: {},
          } as unknown as AttachmentRequestV2,
          expectedHttpCode: 400,
        });
      });

      it('rejects an empty attachmentId', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: { ...timelinePayload, attachmentId: '' } as unknown as AttachmentRequestV2,
          expectedHttpCode: 400,
        });
      });

      it('rejects an extra metadata field without leaking schema internals', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const response = (await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            ...timelinePayload,
            metadata: { title: 'My timeline', extraField: 'not-allowed' },
          } as unknown as AttachmentRequestV2,
          expectedHttpCode: 400,
        })) as unknown as { statusCode: number; error: string; message: string; stack?: string };

        expect(response.statusCode).to.be(400);
        expect(response.error).to.be('Bad Request');
        expect(response.message).to.contain(
          `Invalid attachment payload for type '${SECURITY_TIMELINE_ATTACHMENT_TYPE}'`
        );
        expect(response.message).not.to.contain('ZodError');
        expect(response.stack).to.be(undefined);
      });
    });
  });
};
