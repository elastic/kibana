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
      it('rejects a v1 payload (type, comment, owner) with 400 now that the route is unified-only', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const v1CommentPayload = {
          type: postCommentUserReq.type,
          comment: 'v1 legacy comment',
          owner: 'securitySolutionFixture',
        };

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          // @ts-expect-error: legacy v1 shape, no longer a valid unified attachment
          params: [v1CommentPayload],
          expectedHttpCode: 400,
        });
      });
    });

    describe('unified attachment', () => {
      it('creates a comment attachment with a unified payload and resolves owner from case', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const unifiedCommentPayload = {
          type: 'comment' as const,
          data: { content: 'v2 unified comment' },
          owner: 'securitySolutionFixture',
        };
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [unifiedCommentPayload],
        });

        expect(updatedCase.comments?.length).to.be(1);
        const comment = updatedCase.comments![0] as unknown as {
          type: string;
          data?: { content?: string };
        };
        expect(comment.type).to.eql('comment');
        expect(comment.data?.content).to.eql('v2 unified comment');
        expect(updatedCase.owner).to.eql('securitySolutionFixture');
      });
    });
  });
};
