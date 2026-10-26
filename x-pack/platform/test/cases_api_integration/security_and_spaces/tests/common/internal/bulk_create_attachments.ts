/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { BulkCreateUnifiedAttachmentsRequest } from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

import { defaultUser, postCaseReq, postCommentUserReq } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  bulkCreateAttachments,
  removeServerGeneratedPropertiesFromSavedObject,
} from '../../../../common/lib/api';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('bulk_create_attachments', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('legacy attachment', () => {
      it('rejects a legacy comment payload (type, comment, owner) with 400', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [postCommentUserReq] as unknown as BulkCreateUnifiedAttachmentsRequest,
          expectedHttpCode: 400,
        });
      });
    });

    describe('unified attachment', () => {
      it('creates a comment attachment with a unified payload', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const unifiedCommentPayload = {
          type: 'comment' as const,
          data: { content: 'unified comment' },
          owner: 'securitySolutionFixture',
        };
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [unifiedCommentPayload],
        });

        expect(updatedCase.comments?.length).to.be(1);
        const comment = removeServerGeneratedPropertiesFromSavedObject(updatedCase.comments![0]);
        expect(comment).to.eql({
          ...unifiedCommentPayload,
          created_by: defaultUser,
          pushed_at: null,
          pushed_by: null,
          updated_by: null,
        });
        expect(updatedCase.owner).to.eql('securitySolutionFixture');
      });
    });
  });
};
