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
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { postCaseReq } from '../../../common/lib/mock';
import {
  createCase,
  deleteAllCaseItems,
  bulkCreateAttachments,
  getComment,
  deleteComment,
  deleteAllComments,
  getCase,
} from '../../../common/lib/api';

const getCommentContent = (comment: Record<string, unknown>): string | undefined => {
  const data = comment.data as { content?: string } | undefined;
  return data?.content ?? (comment.comment as string | undefined);
};

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('Unified Comments — CRUD with flag ON', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('create', () => {
      it('creates a unified comment via v2 payload', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'comment' as const,
              data: { content: 'unified comment content' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        expect(updatedCase.comments?.length).to.be(1);
        expect(updatedCase.totalComment).to.be(1);

        const comment = updatedCase.comments![0] as Record<string, unknown>;
        expect(['comment', 'user']).to.contain(comment.type);
        expect(getCommentContent(comment)).to.be('unified comment content');
        expect(comment.owner).to.be('securitySolutionFixture');
      });

      it('writes to cases-attachments SO (not cases-comments) when flag is ON', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'comment' as const,
              data: { content: 'SO type check' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        const commentId = updatedCase.comments![0].id;

        const unifiedSOs = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_ATTACHMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_ATTACHMENT_SAVED_OBJECT}:${commentId}` } },
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
                { term: { _id: `${CASE_COMMENT_SAVED_OBJECT}:${commentId}` } },
              ],
            },
          },
        });

        expect(legacySOs.hits.hits.length).to.be(0);
      });

      it('creates multiple comments via bulk create', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'comment' as const,
              data: { content: 'first comment' },
              owner: 'securitySolutionFixture',
            },
            {
              type: 'comment' as const,
              data: { content: 'second comment' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        expect(updatedCase.comments?.length).to.be(2);
        expect(updatedCase.totalComment).to.be(2);
      });
    });

    describe('read', () => {
      it('gets a single unified comment by id', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'comment' as const,
              data: { content: 'get by id' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        const commentId = updatedCase.comments![0].id;
        const fetched = await getComment({
          supertest,
          caseId: postedCase.id,
          commentId,
        });

        expect(fetched.id).to.be(commentId);
        expect(['comment', 'user']).to.contain(fetched.type);
        expect(getCommentContent(fetched as unknown as Record<string, unknown>)).to.be('get by id');
      });

      it('reflects unified comment in case totalComment count', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'comment' as const,
              data: { content: 'findable comment' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        const refreshedCase = await getCase({
          supertest,
          caseId: postedCase.id,
        });

        expect(refreshedCase.totalComment).to.be(1);
      });
    });

    describe('delete', () => {
      it('deletes a single unified comment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'comment' as const,
              data: { content: 'to be deleted' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        const commentId = updatedCase.comments![0].id;
        await deleteComment({
          supertest,
          caseId: postedCase.id,
          commentId,
        });

        const refreshedCase = await getCase({
          supertest,
          caseId: postedCase.id,
        });

        expect(refreshedCase.totalComment).to.be(0);
      });

      it('deletes all comments (including unified) for a case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'comment' as const,
              data: { content: 'comment 1' },
              owner: 'securitySolutionFixture',
            },
            {
              type: 'comment' as const,
              data: { content: 'comment 2' },
              owner: 'securitySolutionFixture',
            },
          ],
        });

        await deleteAllComments({
          supertest,
          caseId: postedCase.id,
        });

        const refreshedCase = await getCase({
          supertest,
          caseId: postedCase.id,
        });

        expect(refreshedCase.totalComment).to.be(0);
      });
    });

    describe('schema validation', () => {
      it('rejects comment with missing content field in data', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'comment' as const,
              data: {} as { content: string },
              owner: 'securitySolutionFixture',
            },
          ],
          expectedHttpCode: 400,
        });
      });

      it('rejects comment with non-string content', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'comment' as const,
              data: { content: 123 } as unknown as { content: string },
              owner: 'securitySolutionFixture',
            },
          ],
          expectedHttpCode: 400,
        });
      });
    });
  });
};
