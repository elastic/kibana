/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getPostCaseRequest, postCommentUserReq } from '../../../../common/lib/mock';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  getAuthWithSuperUser,
} from '../../../../common/lib/api';
import {
  resetV2,
  runReconcileSoon,
  waitForActivityAbsent,
  waitForActivityForCase,
  waitForAnalyticsCase,
  waitForAttachmentForCase,
  waitForAttachmentsAbsent,
} from './helpers';

const DELETED_SPACE_ID = 'analytics-v2-deleted-space';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');
  const spaces = getService('spaces');
  const deletedSpaceAuth = getAuthWithSuperUser(DELETED_SPACE_ID);
  const survivingSpaceAuth = getAuthWithSuperUser();

  describe('deleted spaces', () => {
    before(async () => {
      await spaces.create({ id: DELETED_SPACE_ID, name: DELETED_SPACE_ID });
    });

    after(async () => {
      await Promise.allSettled([spaces.delete(DELETED_SPACE_ID)]);
      await deleteAllCaseItems(es);
      await resetV2(supertest);
    });

    it('reconciliation deletes analytics docs of a deleted space and keeps the other spaces', async () => {
      const deletedSpaceCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        deletedSpaceAuth
      );
      await createComment({
        supertest: supertestWithoutAuth,
        caseId: deletedSpaceCase.id,
        params: postCommentUserReq,
        auth: deletedSpaceAuth,
      });
      const survivingCase = await createCase(
        supertestWithoutAuth,
        getPostCaseRequest(),
        200,
        survivingSpaceAuth
      );

      await waitForAnalyticsCase(es, deletedSpaceCase.id);
      await waitForActivityForCase(es, deletedSpaceCase.id, 1);
      await waitForAttachmentForCase(es, deletedSpaceCase.id, 1);
      await waitForAnalyticsCase(es, survivingCase.id);

      await spaces.delete(DELETED_SPACE_ID);
      await runReconcileSoon(supertest);

      await waitForAnalyticsCase(es, deletedSpaceCase.id, { expect: 'absent' });
      await waitForActivityAbsent(es, deletedSpaceCase.id);
      await waitForAttachmentsAbsent(es, deletedSpaceCase.id);
      await waitForAnalyticsCase(es, survivingCase.id);
    });
  });
};
