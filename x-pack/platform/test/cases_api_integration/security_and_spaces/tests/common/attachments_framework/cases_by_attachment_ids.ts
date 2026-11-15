/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { CaseStatuses } from '@kbn/cases-plugin/common/types/domain';
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
  getCasesByAttachmentIds,
  updateCaseStatus,
} from '../../../../common/lib/api';
import {
  globalRead,
  noKibanaPrivileges,
  obsOnlyRead,
  obsSecRead,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';
import type { User } from '../../../../common/lib/authentication/types';

const ENTITY_OWNER = 'securitySolutionFixture';
// Legacy alert rows map to `security.alert` through the real owner only.
const ALERT_OWNER = 'securitySolution';
const ALERT_INDEX = '.alerts-test-cases-security-alerts';

const sortCaseIds = (res: Array<{ attachmentId: string; caseIds: string[] }>) =>
  res.map(({ attachmentId, caseIds }) => ({ attachmentId, caseIds: [...caseIds].sort() }));

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const es = getService('es');

  const attachEntity = (
    caseId: string,
    attachmentId: string,
    auth?: { user: User; space: string | null }
  ) =>
    createComment({
      supertest: auth ? supertestWithoutAuth : supertest,
      caseId,
      params: { ...postCommentEntityReq, attachmentId },
      ...(auth ? { auth } : {}),
    });

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

  describe('get cases by attachment ids', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should map each attachment id to the cases it is attached to', async () => {
      const [caseA, caseB] = await Promise.all([
        createCase(supertest, getPostCaseRequest({ owner: ENTITY_OWNER })),
        createCase(supertest, getPostCaseRequest({ owner: ENTITY_OWNER })),
      ]);
      await attachEntity(caseA.id, 'entity-1');
      await attachEntity(caseB.id, 'entity-1');
      await attachEntity(caseB.id, 'entity-2');

      const res = await getCasesByAttachmentIds({
        supertest,
        params: {
          type: 'security.entity',
          owner: ENTITY_OWNER,
          attachmentIds: ['entity-1', 'entity-2', 'entity-none'],
        },
      });

      expect(sortCaseIds(res)).to.eql([
        { attachmentId: 'entity-1', caseIds: [caseA.id, caseB.id].sort() },
        { attachmentId: 'entity-2', caseIds: [caseB.id] },
      ]);
    });

    it('should return only the cases with one of the requested statuses', async () => {
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
        supertest,
        params: {
          type: 'security.entity',
          owner: ENTITY_OWNER,
          attachmentIds: ['entity-1'],
          status: CaseStatuses.open,
        },
      });

      expect(res).to.eql([{ attachmentId: 'entity-1', caseIds: [openCase.id] }]);
    });

    it('should return no cases when the owner filters them out', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest({ owner: ENTITY_OWNER }));
      await attachEntity(postedCase.id, 'entity-1');

      const res = await getCasesByAttachmentIds({
        supertest,
        params: {
          type: 'security.entity',
          owner: 'observabilityFixture',
          attachmentIds: ['entity-1'],
        },
      });

      expect(res).to.eql([]);
    });

    it('should return the cases of an alert attached as legacy on one case and unified on another', async () => {
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
        supertest,
        params: { type: 'security.alert', owner: ALERT_OWNER, attachmentIds: ['alert-1'] },
      });

      expect(sortCaseIds(res)).to.eql([
        { attachmentId: 'alert-1', caseIds: [legacyCase.id, unifiedCase.id].sort() },
      ]);
    });

    it('should return only the requested ids of an attachment that holds several', async () => {
      const postedCase = await createCase(supertest, getPostCaseRequest({ owner: ALERT_OWNER }));
      await attachUnifiedAlert(postedCase.id, ['alert-a', 'alert-b']);

      const res = await getCasesByAttachmentIds({
        supertest,
        params: { type: 'security.alert', owner: ALERT_OWNER, attachmentIds: ['alert-b'] },
      });

      expect(res).to.eql([{ attachmentId: 'alert-b', caseIds: [postedCase.id] }]);
    });

    describe('rbac', () => {
      it('should return the cases of the owners the user can read', async () => {
        const postedCase = await createCase(
          supertestWithoutAuth,
          getPostCaseRequest({ owner: ENTITY_OWNER }),
          200,
          { user: superUser, space: 'space1' }
        );
        await attachEntity(postedCase.id, 'entity-1', { user: superUser, space: 'space1' });

        for (const scenario of [
          { user: globalRead, caseIds: [postedCase.id] },
          { user: superUser, caseIds: [postedCase.id] },
          { user: secOnlyRead, caseIds: [postedCase.id] },
          { user: obsSecRead, caseIds: [postedCase.id] },
          { user: obsOnlyRead, caseIds: [] },
        ]) {
          const res = await getCasesByAttachmentIds({
            supertest: supertestWithoutAuth,
            params: {
              type: 'security.entity',
              owner: ENTITY_OWNER,
              attachmentIds: ['entity-1'],
            },
            auth: { user: scenario.user, space: 'space1' },
          });

          expect(res).to.eql(
            scenario.caseIds.length > 0
              ? [{ attachmentId: 'entity-1', caseIds: scenario.caseIds }]
              : []
          );
        }
      });

      for (const scenario of [
        { user: noKibanaPrivileges, space: 'space1' },
        { user: secOnly, space: 'space2' },
      ]) {
        it(`User ${scenario.user.username} with role(s) ${scenario.user.roles.join()} and space ${
          scenario.space
        } - should not get cases`, async () => {
          const postedCase = await createCase(
            supertestWithoutAuth,
            getPostCaseRequest({ owner: ENTITY_OWNER }),
            200,
            { user: superUser, space: scenario.space }
          );
          await attachEntity(postedCase.id, 'entity-1', { user: superUser, space: scenario.space });

          await getCasesByAttachmentIds({
            supertest: supertestWithoutAuth,
            params: {
              type: 'security.entity',
              owner: ENTITY_OWNER,
              attachmentIds: ['entity-1'],
            },
            auth: { user: scenario.user, space: scenario.space },
            expectedHttpCode: 403,
          });
        });
      }
    });
  });
};
