/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getPostCaseRequest, postCaseReq } from '../../../../common/lib/mock';
import {
  bulkCreateAttachments,
  createCase,
  deleteAllCaseItems,
  searchCases,
} from '../../../../common/lib/api';

const EVENTS_INDEX = 'test-search-events-index';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  const searchCaseIds = async (search: string, searchFields: string[]): Promise<string[]> => {
    const { cases } = await searchCases({ supertest, body: { search, searchFields } });
    return cases.map(({ id }) => id);
  };

  describe('Unified attachments — case search', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
      await es.indices.delete({ index: EVENTS_INDEX, ignore_unavailable: true });
    });

    it('finds a case by the content of a unified comment', async () => {
      const postedCase = await createCase(supertest, postCaseReq);
      await bulkCreateAttachments({
        supertest,
        caseId: postedCase.id,
        params: [
          {
            type: 'comment' as const,
            data: { content: 'unified searchable comment' },
            owner: 'securitySolutionFixture',
          },
        ],
      });

      expect(await searchCaseIds('unified searchable comment', ['cases-comments.comment'])).to.eql([
        postedCase.id,
      ]);
    });

    it('finds a case by the id of a unified alert', async () => {
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({ owner: 'securitySolution' })
      );
      await bulkCreateAttachments({
        supertest,
        caseId: postedCase.id,
        params: [
          {
            type: 'security.alert' as const,
            attachmentId: 'search-alert-id',
            metadata: {
              index: '.alerts-security.alerts-default',
              rule: { id: 'rule-1', name: 'Rule 1' },
            },
            owner: 'securitySolution',
          },
        ],
      });

      expect(await searchCaseIds('search-alert-id', ['cases-comments.alertId'])).to.eql([
        postedCase.id,
      ]);
    });

    it('finds a case by the id of a unified event, but not when searching alert ids', async () => {
      await es.index({
        index: EVENTS_INDEX,
        id: 'search-event-id',
        document: { '@timestamp': new Date().toISOString() },
        refresh: true,
      });
      const postedCase = await createCase(supertest, postCaseReq);
      await bulkCreateAttachments({
        supertest,
        caseId: postedCase.id,
        params: [
          {
            type: 'security.event' as const,
            attachmentId: 'search-event-id',
            metadata: { index: EVENTS_INDEX },
            owner: 'securitySolutionFixture',
          },
        ],
      });

      expect(await searchCaseIds('search-event-id', ['cases-comments.eventId'])).to.eql([
        postedCase.id,
      ]);
      expect(await searchCaseIds('search-event-id', ['cases-comments.alertId'])).to.eql([]);
    });
  });
};
