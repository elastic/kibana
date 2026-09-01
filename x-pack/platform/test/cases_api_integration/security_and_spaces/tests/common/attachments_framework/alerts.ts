/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  CASE_ATTACHMENT_SAVED_OBJECT,
  CASE_COMMENT_SAVED_OBJECT,
} from '@kbn/cases-plugin/common/constants';
import { ALERTING_CASES_SAVED_OBJECT_INDEX } from '@kbn/core-saved-objects-server/src/saved_objects_index_pattern';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getPostCaseRequest, postCommentAlertReq } from '../../../../common/lib/mock';
import {
  createCase,
  createComment,
  deleteAllCaseItems,
  bulkCreateAttachments,
  getComment,
  deleteComment,
  getCase,
  getAlertsAttachedToCase,
  getCasesByAlert,
} from '../../../../common/lib/api';
import { validateCasesFromAlertIDResponse } from '../../../../common/lib/validation';

const OWNER = 'securitySolution';
const postCaseReq = getPostCaseRequest({ owner: OWNER });
const postCommentAlertReqRealOwner = { ...postCommentAlertReq, owner: OWNER };

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('Unified Alerts — CRUD, aggregation, mixed legacy + unified', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    describe('create', () => {
      it('creates a unified security.alert via v2 payload', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.alert' as const,
              attachmentId: 'alert-doc-1',
              metadata: {
                index: '.alerts-security.alerts-default',
                rule: { id: 'rule-1', name: 'Suspicious activity' },
              },
              owner: OWNER,
            },
          ],
        });

        expect(updatedCase.comments?.length).to.be(1);
        const alert = updatedCase.comments![0];
        // Unified alerts are returned with their registered type id (or coerced to `alert`
        // in the legacy view shape on read paths).
        expect(['security.alert', 'alert']).to.contain(alert.type);
      });

      it('writes alert to cases-attachments SO when flag is ON', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.alert' as const,
              attachmentId: 'alert-so-check',
              metadata: {
                index: '.alerts-security.alerts-default',
                rule: { id: 'rule-2', name: 'Rule 2' },
              },
              owner: OWNER,
            },
          ],
        });

        const alertId = updatedCase.comments![0].id;

        const unifiedSOs = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_ATTACHMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_ATTACHMENT_SAVED_OBJECT}:${alertId}` } },
              ],
            },
          },
        });

        expect(unifiedSOs.hits.hits.length).to.be(1);

        const legacySOs = await es.search({
          index: ALERTING_CASES_SAVED_OBJECT_INDEX,
          query: {
            bool: {
              must: [
                { term: { type: CASE_COMMENT_SAVED_OBJECT } },
                { term: { _id: `${CASE_COMMENT_SAVED_OBJECT}:${alertId}` } },
              ],
            },
          },
        });

        expect(legacySOs.hits.hits.length).to.be(0);
      });

      it('creates a unified alert with array attachmentId (de-duped doc ids)', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const index = '.alerts-security.alerts-default';
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.alert' as const,
              attachmentId: ['alert-1', 'alert-2', 'alert-3'],
              metadata: {
                // The attachmentId / index pair is enforced to be the same length
                // by the dedup guard in case_with_comments.ts.
                index: [index, index, index],
                rule: { id: 'rule-3', name: 'Rule 3' },
              },
              owner: OWNER,
            },
          ],
        });

        expect(updatedCase.comments?.length).to.be(1);
        expect(updatedCase.totalAlerts).to.be(3);
      });
    });

    describe('read', () => {
      it('retrieves a unified alert by id', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.alert' as const,
              attachmentId: 'alert-read-1',
              metadata: {
                index: '.alerts-security.alerts-default',
                rule: { id: 'rule-r1', name: 'Rule R1' },
              },
              owner: OWNER,
            },
          ],
        });

        const alertId = updatedCase.comments![0].id;
        const fetched = await getComment({
          supertest,
          caseId: postedCase.id,
          commentId: alertId,
        });

        expect(fetched.id).to.be(alertId);
        expect(['security.alert', 'alert']).to.contain(fetched.type);
      });

      it('reflects unified alerts in case totalAlerts count', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.alert' as const,
              attachmentId: 'alert-total-1',
              metadata: {
                index: '.alerts-security.alerts-default',
                rule: { id: 'rule-t1', name: 'Rule T1' },
              },
              owner: OWNER,
            },
            {
              type: 'security.alert' as const,
              attachmentId: 'alert-total-2',
              metadata: {
                index: '.alerts-security.alerts-default',
                rule: { id: 'rule-t1', name: 'Rule T1' },
              },
              owner: OWNER,
            },
          ],
        });

        const refreshedCase = await getCase({
          supertest,
          caseId: postedCase.id,
        });

        expect(refreshedCase.totalAlerts).to.be(2);
      });

      it('lists unified alerts via GET /:caseId/alerts', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const index = '.alerts-security.alerts-default';
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.alert' as const,
              attachmentId: ['alert-list-1', 'alert-list-2'],
              metadata: {
                index: [index, index],
                rule: { id: 'rule-l', name: 'Rule L' },
              },
              owner: OWNER,
            },
          ],
        });

        const alerts = await getAlertsAttachedToCase({ supertest, caseId: postedCase.id });
        const ids = alerts.map((a: { id: string }) => a.id);
        expect(ids).to.contain('alert-list-1');
        expect(ids).to.contain('alert-list-2');
      });

      it('finds cases by unified alert id via GET /cases/alerts/:alertId', async () => {
        const [case1, case2] = await Promise.all([
          createCase(supertest, getPostCaseRequest({ owner: OWNER, title: 'a' })),
          createCase(supertest, getPostCaseRequest({ owner: OWNER, title: 'b' })),
        ]);

        await Promise.all([
          bulkCreateAttachments({
            supertest,
            caseId: case1.id,
            params: [
              {
                type: 'security.alert' as const,
                attachmentId: 'shared-alert-id',
                metadata: {
                  index: '.alerts-security.alerts-default',
                  rule: { id: 'rule-shared', name: 'Shared' },
                },
                owner: OWNER,
              },
            ],
          }),
          bulkCreateAttachments({
            supertest,
            caseId: case2.id,
            params: [
              {
                type: 'security.alert' as const,
                attachmentId: 'shared-alert-id',
                metadata: {
                  index: '.alerts-security.alerts-default',
                  rule: { id: 'rule-shared', name: 'Shared' },
                },
                owner: OWNER,
              },
            ],
          }),
        ]);

        const cases = await getCasesByAlert({ supertest, alertID: 'shared-alert-id' });
        expect(cases.length).to.eql(2);
        validateCasesFromAlertIDResponse(cases, [
          { caseInfo: case1, totals: { alerts: 1, userComments: 0, events: 0 } },
          { caseInfo: case2, totals: { alerts: 1, userComments: 0, events: 0 } },
        ]);
      });
    });

    describe('mixed legacy + unified alerts on the same case', () => {
      it('counts both legacy and unified alerts in totalAlerts', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        // Legacy v1 alert (writes to cases-comments SO)
        await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentAlertReqRealOwner,
        });

        // Unified v2 alert (writes to cases-attachments SO)
        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.alert' as const,
              attachmentId: 'unified-mix-1',
              metadata: {
                index: '.alerts-security.alerts-default',
                rule: { id: 'rule-mix', name: 'Rule mix' },
              },
              owner: OWNER,
            },
          ],
        });

        const refreshedCase = await getCase({ supertest, caseId: postedCase.id });
        expect(refreshedCase.totalAlerts).to.be(2);
      });

      it('GET /:caseId/alerts returns both legacy and unified alert ids', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await createComment({
          supertest,
          caseId: postedCase.id,
          params: {
            ...postCommentAlertReqRealOwner,
            alertId: 'legacy-alert-id',
            index: 'legacy-index',
          },
        });

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.alert' as const,
              attachmentId: 'unified-alert-id',
              metadata: {
                index: '.alerts-security.alerts-default',
                rule: { id: 'rule-mix', name: 'Rule mix' },
              },
              owner: OWNER,
            },
          ],
        });

        const alerts = await getAlertsAttachedToCase({ supertest, caseId: postedCase.id });
        const ids = alerts.map((a: { id: string }) => a.id);
        expect(ids).to.contain('legacy-alert-id');
        expect(ids).to.contain('unified-alert-id');
      });

      it('finds cases by alert id when alert is attached as legacy on one case and unified on another', async () => {
        const [legacyCase, unifiedCase] = await Promise.all([
          createCase(supertest, getPostCaseRequest({ owner: OWNER, title: 'legacy' })),
          createCase(supertest, getPostCaseRequest({ owner: OWNER, title: 'unified' })),
        ]);

        await createComment({
          supertest,
          caseId: legacyCase.id,
          params: { ...postCommentAlertReqRealOwner, alertId: 'cross-format-id' },
        });

        await bulkCreateAttachments({
          supertest,
          caseId: unifiedCase.id,
          params: [
            {
              type: 'security.alert' as const,
              attachmentId: 'cross-format-id',
              metadata: {
                index: '.alerts-security.alerts-default',
                rule: { id: 'rule-cross', name: 'Cross' },
              },
              owner: OWNER,
            },
          ],
        });

        const cases = await getCasesByAlert({ supertest, alertID: 'cross-format-id' });
        expect(cases.length).to.eql(2);
        validateCasesFromAlertIDResponse(cases, [
          { caseInfo: legacyCase, totals: { alerts: 1, userComments: 0, events: 0 } },
          { caseInfo: unifiedCase, totals: { alerts: 1, userComments: 0, events: 0 } },
        ]);
      });
    });

    describe('delete', () => {
      it('deletes a unified alert and updates totalAlerts', async () => {
        const postedCase = await createCase(supertest, postCaseReq);
        const updatedCase = await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.alert' as const,
              attachmentId: 'alert-delete-1',
              metadata: {
                index: '.alerts-security.alerts-default',
                rule: { id: 'rule-d', name: 'Rule D' },
              },
              owner: OWNER,
            },
          ],
        });

        const alertId = updatedCase.comments![0].id;
        await deleteComment({
          supertest,
          caseId: postedCase.id,
          commentId: alertId,
        });

        const refreshedCase = await getCase({
          supertest,
          caseId: postedCase.id,
        });

        expect(refreshedCase.totalAlerts).to.be(0);
      });

      it('deleting a legacy alert leaves the unified alert intact', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        const legacyResult = await createComment({
          supertest,
          caseId: postedCase.id,
          params: postCommentAlertReqRealOwner,
        });
        const legacyAlertCommentId = legacyResult.comments![0].id;

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [
            {
              type: 'security.alert' as const,
              attachmentId: 'survives-delete',
              metadata: {
                index: '.alerts-security.alerts-default',
                rule: { id: 'rule-s', name: 'Rule S' },
              },
              owner: OWNER,
            },
          ],
        });

        await deleteComment({
          supertest,
          caseId: postedCase.id,
          commentId: legacyAlertCommentId,
        });

        const refreshedCase = await getCase({ supertest, caseId: postedCase.id });
        expect(refreshedCase.totalAlerts).to.be(1);

        const alerts = await getAlertsAttachedToCase({ supertest, caseId: postedCase.id });
        const ids = alerts.map((a: { id: string }) => a.id);
        expect(ids).to.contain('survives-delete');
      });
    });
  });
};
