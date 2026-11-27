/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { postCaseReq, postCommentAlertReq, postCommentUserReq } from '../../../../common/lib/mock';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  searchCases,
} from '../../../../common/lib/api';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  const searchCaseIds = async (search: string, searchFields: string[]): Promise<string[]> => {
    const { cases } = await searchCases({
      supertest,
      body: { search, searchFields, owner: 'securitySolutionFixture' },
    });
    return cases.map(({ id }) => id);
  };

  describe('Legacy attachments — case search', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('finds a case by the content of a legacy comment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: { ...postCommentUserReq, comment: 'legacy searchable comment' },
      });

      expect(await searchCaseIds('legacy searchable comment', ['cases-comments.comment'])).to.eql([
        postedCase.id,
      ]);
    });

    it('finds a case by the id of a legacy alert', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await createComment({
        supertest,
        caseId: postedCase.id,
        params: { ...postCommentAlertReq, alertId: 'legacy-search-alert-id' },
      });

      expect(await searchCaseIds('legacy-search-alert-id', ['cases-comments.alertId'])).to.eql([
        postedCase.id,
      ]);
    });
  });
};
