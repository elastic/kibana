/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { SECURITY_TIMELINE_ATTACHMENT_TYPE } from '@kbn/cases-plugin/common/constants';
import type { AttachmentRequestV2 } from '@kbn/cases-plugin/common/types/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCaseReq } from '../../../../common/lib/mock';
import { createCase, createComment, deleteAllCaseItems } from '../../../../common/lib/api';

/**
 * `security.timeline` is a unified-only type with no legacy representation, so
 * it cannot be persisted as a legacy `cases-comments` SO. With the flag OFF the
 * write path rejects it with an actionable 400 instead of an opaque 500.
 */
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('unified-only attachment writes (feature flag OFF)', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('400s when creating a security.timeline attachment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      const response = (await createComment({
        supertest,
        caseId: postedCase.id,
        params: {
          type: SECURITY_TIMELINE_ATTACHMENT_TYPE,
          owner: 'securitySolutionFixture',
          attachmentId: 'timeline-1',
          metadata: { title: 'My timeline' },
        } as unknown as AttachmentRequestV2,
        expectedHttpCode: 400,
      })) as unknown as { statusCode: number; message: string };

      expect(response.statusCode).to.be(400);
      expect(response.message).to.contain('has no legacy representation');
    });
  });
};
