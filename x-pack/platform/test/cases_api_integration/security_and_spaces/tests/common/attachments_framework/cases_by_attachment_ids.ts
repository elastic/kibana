/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CaseStatuses } from '@kbn/cases-plugin/common/types/domain';
import type { CasesByAttachmentIDsRequest } from '@kbn/cases-plugin/server/client/cases/get';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import {
  getPostCaseRequest,
  postCommentAlertReq,
  postCommentEntityReq,
} from '../../../../common/lib/mock';
import {
  bulkCreateAttachments,
  createCase,
  createComment,
  deleteAllCaseItems,
  updateCaseStatus,
} from '../../../../common/lib/api';

const ENTITY_OWNER = 'securitySolutionFixture';
// Legacy alert rows map to `security.alert` through the real owner only.
const ALERT_OWNER = 'securitySolution';
const ALERT_INDEX = '.alerts-test-cases-security-alerts';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  const getCasesByAttachmentIds = async (
    request: CasesByAttachmentIDsRequest
  ): Promise<Array<{ attachmentId: string; caseIds: string[] }>> => {
    const { body } = await supertest
      .post('/api/cases_fixture/cases:getCasesByAttachmentIds')
      .set('kbn-xsrf', 'true')
      .send(request)
      .expect(200);
    return body.map(({ attachmentId, caseIds }: { attachmentId: string; caseIds: string[] }) => ({
      attachmentId,
      caseIds: [...caseIds].sort(),
    }));
  };

  const attachEntity = (caseId: string, attachmentId: string) =>
    createComment({ supertest, caseId, params: { ...postCommentEntityReq, attachmentId } });

  const attachUnifiedAlert = (caseId: string, attachmentId: string | string[]) =>
    bulkCreateAttachments({
      supertest,
      caseId,
      params: [
        {
          type: 'security.alert' as const,
          attachmentId,
          metadata: { index: ALERT_INDEX, rule: { id: 'rule-1', name: 'Rule 1' } },
          owner: ALERT_OWNER,
        },
      ],
    });

  describe('cases client getCasesByAttachmentIDs', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('maps each attachment id to the cases it is attached to, leaving out ids in no case', async () => {
      const [caseA, caseB] = await Promise.all([
        createCase(supertest, getPostCaseRequest({ owner: ENTITY_OWNER })),
        createCase(supertest, getPostCaseRequest({ owner: ENTITY_OWNER })),
      ]);
      await attachEntity(caseA.id, 'entity-1');
      await attachEntity(caseB.id, 'entity-1');
      await attachEntity(caseB.id, 'entity-2');

      const res = await getCasesByAttachmentIds({
        type: 'security.entity',
        owner: ENTITY_OWNER,
        attachmentIds: ['entity-1', 'entity-2', 'entity-none'],
      });

      expect(res).to.eql([
        { attachmentId: 'entity-1', caseIds: [caseA.id, caseB.id].sort() },
        { attachmentId: 'entity-2', caseIds: [caseB.id] },
      ]);
    });

    it('keeps only the cases with one of the requested statuses', async () => {
      const [openCase, closedCase] = await Promise.all([
        createCase(supertest, getPostCaseRequest({ owner: ENTITY_OWNER })),
        createCase(supertest, getPostCaseRequest({ owner: ENTITY_OWNER })),
      ]);
      await attachEntity(openCase.id, 'entity-1');
      const { version } = await attachEntity(closedCase.id, 'entity-1');
      await updateCaseStatus({
        supertest,
        caseId: closedCase.id,
        version,
        status: CaseStatuses.closed,
        expectedHttpCode: 200,
      });

      const res = await getCasesByAttachmentIds({
        type: 'security.entity',
        owner: ENTITY_OWNER,
        attachmentIds: ['entity-1'],
        status: CaseStatuses.open,
      });

      expect(res).to.eql([{ attachmentId: 'entity-1', caseIds: [openCase.id] }]);
    });

    it('reads only the cases of the requested owner', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest({ owner: ENTITY_OWNER }));
      await attachEntity(postedCase.id, 'entity-1');

      const res = await getCasesByAttachmentIds({
        type: 'security.entity',
        owner: 'observabilityFixture',
        attachmentIds: ['entity-1'],
      });

      expect(res).to.eql([]);
    });

    it('finds the cases of an alert attached as legacy on one case and unified on another', async () => {
      const [legacyCase, unifiedCase] = await Promise.all([
        createCase(supertest, getPostCaseRequest({ owner: ALERT_OWNER })),
        createCase(supertest, getPostCaseRequest({ owner: ALERT_OWNER })),
      ]);
      // The v1 comment route writes cases-comments rows.
      await createComment({
        supertest,
        caseId: legacyCase.id,
        params: { ...postCommentAlertReq, owner: ALERT_OWNER, alertId: 'alert-1' },
      });
      await attachUnifiedAlert(unifiedCase.id, 'alert-1');

      const res = await getCasesByAttachmentIds({
        type: 'security.alert',
        owner: ALERT_OWNER,
        attachmentIds: ['alert-1'],
      });

      expect(res).to.eql([
        { attachmentId: 'alert-1', caseIds: [legacyCase.id, unifiedCase.id].sort() },
      ]);
    });

    it('returns only the requested ids of an attachment that holds several', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest({ owner: ALERT_OWNER }));
      await attachUnifiedAlert(postedCase.id, ['alert-a', 'alert-b']);

      const res = await getCasesByAttachmentIds({
        type: 'security.alert',
        owner: ALERT_OWNER,
        attachmentIds: ['alert-b'],
      });

      expect(res).to.eql([{ attachmentId: 'alert-b', caseIds: [postedCase.id] }]);
    });
  });
};
