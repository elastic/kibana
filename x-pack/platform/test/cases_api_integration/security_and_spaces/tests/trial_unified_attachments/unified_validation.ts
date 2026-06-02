/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  UnifiedReferenceAttachmentPayload,
  UnifiedValueAttachmentPayload,
} from '@kbn/cases-plugin/common/types/domain';
import type { FtrProviderContext } from '../../../common/ftr_provider_context';
import { postCaseReq } from '../../../common/lib/mock';
import { createCase, deleteAllCaseItems, bulkCreateAttachments } from '../../../common/lib/api';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('Validation/Error Cases', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('unregistered types', () => {
      it('400s when creating a unified attachment with an unregistered type', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'not.registered.type' as const,
              data: { content: 'should fail' },
              owner: 'securitySolutionFixture',
            },
          ],
          expectedHttpCode: 400,
        });
      });

      it('400s when creating a unified reference attachment with unregistered type', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'not.registered.reference' as const,
              attachmentId: 'ref-1',
              owner: 'securitySolutionFixture',
            },
          ],
          expectedHttpCode: 400,
        });
      });

      it('400s in bulk when one of multiple attachments has unregistered type', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'comment' as const,
              data: { content: 'valid comment' },
              owner: 'securitySolutionFixture',
            },
            {
              type: 'does.not.exist' as const,
              data: { content: 'invalid' },
              owner: 'securitySolutionFixture',
            },
          ],
          expectedHttpCode: 400,
        });
      });
    });

    describe('invalid payloads', () => {
      it('400s when comment data is missing content', async () => {
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

      it('400s when event metadata has invalid index type', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.event' as const,
              attachmentId: 'event-1',
              metadata: { index: 123 as unknown as string },
              owner: 'securitySolutionFixture',
            },
          ],
          expectedHttpCode: 400,
        });
      });

      it('400s when unified value attachment is missing data field', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'lens',
              owner: 'securitySolutionFixture',
            } as UnifiedValueAttachmentPayload,
          ],
          expectedHttpCode: 400,
        });
      });

      it('400s when unified reference attachment is missing attachmentId', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.event',
              metadata: { index: 'test-index' },
              owner: 'securitySolutionFixture',
            } as unknown as UnifiedReferenceAttachmentPayload,
          ],
          expectedHttpCode: 400,
        });
      });

      it('400s when owner is missing from unified attachment', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'comment',
              data: { content: 'no owner' },
            } as unknown as UnifiedValueAttachmentPayload,
          ],
          expectedHttpCode: 400,
        });
      });
    });

    describe('non-existent case', () => {
      it('404s when creating attachment on non-existent case', async () => {
        await bulkCreateAttachments({
          supertest,
          caseId: 'does-not-exist-case-id',
          params: [
            {
              type: 'comment' as const,
              data: { content: 'orphan' },
              owner: 'securitySolutionFixture',
            },
          ],
          expectedHttpCode: 404,
        });
      });
    });
  });
};
