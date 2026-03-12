/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';
import { deleteAllCaseItems, createCase, bulkCreateAttachments } from '../../../../common/lib/api';

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
  });
};
