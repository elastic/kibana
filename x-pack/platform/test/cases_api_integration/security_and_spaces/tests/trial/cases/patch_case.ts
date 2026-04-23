/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import {
  AttachmentType,
  CaseStatuses,
  UserActionTypes,
} from '@kbn/cases-plugin/common/types/domain';
import { ALERT_WORKFLOW_REASON, ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { getPostCaseRequest, postCaseReq, postCaseResp } from '../../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  createComment,
  removeServerGeneratedPropertiesFromCase,
  updateCase,
  findCaseUserActions,
} from '../../../../common/lib/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';

export const defaultUser = {
  email: null,
  full_name: null,
  username: 'elastic',
  profile_uid: 'u_mGBROF_q5bmFCATbLXAcCwKa0k8JvONAwSruelyKA5E_0',
};

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('patch_case', () => {
    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should filter out empty assignee.uid values', async () => {
      const randomUid = '7f3e9d2a-1b8c-4c5f-9e6d-8f2a4b1d3c7e';
      const postedCase = await createCase(supertest, postCaseReq);
      const patchedCases = await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              assignees: [{ uid: '' }, { uid: randomUid }],
            },
          ],
        },
      });

      const data = removeServerGeneratedPropertiesFromCase(patchedCases[0]);
      expect(data).to.eql({
        ...postCaseResp(),
        assignees: [{ uid: randomUid }],
        updated_by: defaultUser,
      });
    });

    describe('close reason', () => {
      it('should close a case with a valid closeReason when syncAlerts is true', async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({ settings: { syncAlerts: true, extractObservables: false } })
        );

        const patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: CaseStatuses.closed,
                closeReason: 'false_positive',
              },
            ],
          },
        });

        expect(patchedCases[0].status).to.eql(CaseStatuses.closed);

        const userActionsResponse = await findCaseUserActions({
          supertest,
          caseID: postedCase.id,
          options: { types: [UserActionTypes.status], sortOrder: 'asc' },
        });

        const statusUserAction = userActionsResponse.userActions[0];
        expect(statusUserAction.payload).to.eql({
          status: CaseStatuses.closed,
          closeReason: 'false_positive',
        });
      });

      it('should reject a close request with an invalid closeReason', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: CaseStatuses.closed,
                closeReason: 'invalid_custom_reason_not_in_settings',
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('should reopen a case that was previously closed with a closeReason', async () => {
        const postedCase = await createCase(supertest, postCaseReq);

        const closedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: CaseStatuses.closed,
                closeReason: 'other',
              },
            ],
          },
        });

        expect(closedCases[0].status).to.eql(CaseStatuses.closed);

        const reopenedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: closedCases[0].id,
                version: closedCases[0].version,
                status: CaseStatuses.open,
              },
            ],
          },
        });

        expect(reopenedCases[0].status).to.eql(CaseStatuses.open);
      });

      it('should not override the close reason of an already-closed alert when closing the case', async () => {
        const testAlertIndex = 'test-cases-alert-close-reason';
        const testAlertId = 'already-closed-alert-id';
        const originalCloseReason = 'false_positive';

        // Index the alert as open so that attaching it to the (open) case with
        // syncAlerts=true is a no-op sync — avoids wiping an existing close reason
        await es.index({
          index: testAlertIndex,
          id: testAlertId,
          document: {
            '@timestamp': new Date().toISOString(),
            [ALERT_WORKFLOW_STATUS]: 'open',
          },
          refresh: true,
        });

        try {
          const postedCase = await createCase(
            supertest,
            getPostCaseRequest({ settings: { syncAlerts: true, extractObservables: false } })
          );

          const caseAfterComment = await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              alertId: testAlertId,
              index: testAlertIndex,
              rule: { id: 'test-rule-id', name: 'test-rule' },
              type: AttachmentType.alert,
              owner: 'securitySolutionFixture',
            },
          });

          // Simulate the alert being independently closed (e.g. by another system)
          // before the case is closed — bypassing Cases sync
          await es.update({
            index: testAlertIndex,
            id: testAlertId,
            doc: {
              [ALERT_WORKFLOW_STATUS]: 'closed',
              [ALERT_WORKFLOW_REASON]: originalCloseReason,
            },
            refresh: true,
          });

          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: caseAfterComment.id,
                  version: caseAfterComment.version,
                  status: CaseStatuses.closed,
                  closeReason: 'duplicate',
                },
              ],
            },
          });

          const alertDoc = await es.get<Record<string, string>>({
            index: testAlertIndex,
            id: testAlertId,
          });

          // Alert was already closed — the sync script noops when status hasn't changed,
          // so the original close reason must be preserved
          expect(alertDoc._source?.[ALERT_WORKFLOW_REASON]).to.eql(originalCloseReason);
        } finally {
          await es.indices.delete({ index: testAlertIndex, ignore_unavailable: true });
        }
      });

      it('should sync the close reason to an open alert when closing the case', async () => {
        const testAlertIndex = 'test-cases-alert-close-reason-sync';
        const testAlertId = 'open-alert-id';
        const closeReason = 'true_positive';

        await es.index({
          index: testAlertIndex,
          id: testAlertId,
          document: {
            '@timestamp': new Date().toISOString(),
            [ALERT_WORKFLOW_STATUS]: 'open',
          },
          refresh: true,
        });

        try {
          const postedCase = await createCase(
            supertest,
            getPostCaseRequest({ settings: { syncAlerts: true, extractObservables: false } })
          );

          const caseAfterComment = await createComment({
            supertest,
            caseId: postedCase.id,
            params: {
              alertId: testAlertId,
              index: testAlertIndex,
              rule: { id: 'test-rule-id', name: 'test-rule' },
              type: AttachmentType.alert,
              owner: 'securitySolutionFixture',
            },
          });

          await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: caseAfterComment.id,
                  version: caseAfterComment.version,
                  status: CaseStatuses.closed,
                  closeReason,
                },
              ],
            },
          });

          const alertDoc = await es.get<Record<string, string>>({
            index: testAlertIndex,
            id: testAlertId,
          });

          expect(alertDoc._source?.[ALERT_WORKFLOW_STATUS]).to.eql('closed');
          expect(alertDoc._source?.[ALERT_WORKFLOW_REASON]).to.eql(closeReason);
        } finally {
          await es.indices.delete({ index: testAlertIndex, ignore_unavailable: true });
        }
      });

      it('should sync different close reasons to each alert when bulk-closing multiple cases', async () => {
        const testAlertIndex = 'test-cases-bulk-close-reason';

        const alerts = [
          { id: 'bulk-alert-1', closeReason: 'false_positive' },
          { id: 'bulk-alert-2', closeReason: 'duplicate' },
          { id: 'bulk-alert-3', closeReason: 'other' },
        ] as const;

        await Promise.all(
          alerts.map(({ id }) =>
            es.index({
              index: testAlertIndex,
              id,
              document: {
                '@timestamp': new Date().toISOString(),
                [ALERT_WORKFLOW_STATUS]: 'open',
              },
            })
          )
        );
        await es.indices.refresh({ index: testAlertIndex });

        try {
          const cases = await Promise.all(
            alerts.map(({ closeReason }) =>
              createCase(
                supertest,
                getPostCaseRequest({
                  title: `case for ${closeReason}`,
                  settings: { syncAlerts: true, extractObservables: false },
                })
              )
            )
          );

          const casesAfterComments = await Promise.all(
            cases.map((postedCase, i) =>
              createComment({
                supertest,
                caseId: postedCase.id,
                params: {
                  alertId: alerts[i].id,
                  index: testAlertIndex,
                  rule: { id: 'test-rule-id', name: 'test-rule' },
                  type: AttachmentType.alert,
                  owner: 'securitySolutionFixture',
                },
              })
            )
          );

          const updatedCases = await updateCase({
            supertest,
            params: {
              cases: casesAfterComments.map((updatedCase, i) => ({
                id: updatedCase.id,
                version: updatedCase.version,
                status: CaseStatuses.closed,
                closeReason: alerts[i].closeReason,
              })),
            },
          });

          expect(updatedCases.every((c) => c.status === CaseStatuses.closed)).to.be(true);

          const alertDocs = await Promise.all(
            alerts.map(({ id }) => es.get<Record<string, string>>({ index: testAlertIndex, id }))
          );

          alertDocs.forEach((doc, i) => {
            expect(doc._source?.[ALERT_WORKFLOW_STATUS]).to.eql('closed');
            expect(doc._source?.[ALERT_WORKFLOW_REASON]).to.eql(alerts[i].closeReason);
          });
        } finally {
          await es.indices.delete({ index: testAlertIndex, ignore_unavailable: true });
        }
      });

      it('should only update open alerts and report accurate syncedAlertCount when case has mixed-status alerts', async () => {
        const testAlertIndex = 'test-cases-mixed-alert-statuses';

        // Three alerts with different initial states
        const openAlert = {
          id: 'mixed-alert-open',
          initialStatus: 'open',
          initialReason: undefined,
        };
        const closedAlert = {
          id: 'mixed-alert-closed',
          initialStatus: 'closed',
          initialReason: undefined,
        };
        const closedWithReasonAlert = {
          id: 'mixed-alert-closed-with-reason',
          initialStatus: 'closed',
          initialReason: 'false_positive',
        };

        await Promise.all([
          es.index({
            index: testAlertIndex,
            id: openAlert.id,
            document: { '@timestamp': new Date().toISOString(), [ALERT_WORKFLOW_STATUS]: 'open' },
          }),
          es.index({
            index: testAlertIndex,
            id: closedAlert.id,
            document: { '@timestamp': new Date().toISOString(), [ALERT_WORKFLOW_STATUS]: 'closed' },
          }),
          es.index({
            index: testAlertIndex,
            id: closedWithReasonAlert.id,
            document: {
              '@timestamp': new Date().toISOString(),
              [ALERT_WORKFLOW_STATUS]: 'closed',
              [ALERT_WORKFLOW_REASON]: closedWithReasonAlert.initialReason,
            },
          }),
        ]);
        await es.indices.refresh({ index: testAlertIndex });

        try {
          // Create the case with syncAlerts=false so that attaching alerts does not
          // trigger status sync — preserving the alerts' original states
          let currentCase = await createCase(
            supertest,
            getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: false } })
          );
          for (const { id } of [openAlert, closedAlert, closedWithReasonAlert]) {
            currentCase = await createComment({
              supertest,
              caseId: currentCase.id,
              params: {
                alertId: id,
                index: testAlertIndex,
                rule: { id: 'test-rule-id', name: 'test-rule' },
                type: AttachmentType.alert,
                owner: 'securitySolutionFixture',
              },
            });
          }

          // Enable syncAlerts before closing so the close-reason validator accepts the
          // request (it requires syncAlerts to be on). Enabling sync on an open case
          // moves all attached alerts to "open" — we restore the mixed statuses below.
          const [syncEnabledCase] = await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: currentCase.id,
                  version: currentCase.version,
                  settings: { syncAlerts: true, extractObservables: false },
                },
              ],
            },
          });

          // Restore the mixed alert statuses that the sync-on transition overwrote.
          await Promise.all([
            es.index({
              index: testAlertIndex,
              id: closedAlert.id,
              document: {
                '@timestamp': new Date().toISOString(),
                [ALERT_WORKFLOW_STATUS]: 'closed',
              },
            }),
            es.index({
              index: testAlertIndex,
              id: closedWithReasonAlert.id,
              document: {
                '@timestamp': new Date().toISOString(),
                [ALERT_WORKFLOW_STATUS]: 'closed',
                [ALERT_WORKFLOW_REASON]: closedWithReasonAlert.initialReason,
              },
            }),
          ]);
          await es.indices.refresh({ index: testAlertIndex });

          // Close the case with a close reason. syncAlerts is already on, so the
          // validator passes and only the open alert gets synced to closed.
          const updatedCases = await updateCase({
            supertest,
            params: {
              cases: [
                {
                  id: syncEnabledCase.id,
                  version: syncEnabledCase.version,
                  status: CaseStatuses.closed,
                  closeReason: 'duplicate',
                },
              ],
            },
          });

          expect(updatedCases[0].status).to.eql(CaseStatuses.closed);

          const userActionsResponse = await findCaseUserActions({
            supertest,
            caseID: currentCase.id,
            options: { types: [UserActionTypes.status], sortOrder: 'asc' },
          });

          expect(userActionsResponse.userActions[0].payload).to.eql({
            status: CaseStatuses.closed,
            closeReason: 'duplicate',
            syncedAlertCount: 1,
          });

          const [openDoc, closedDoc, closedWithReasonDoc] = await Promise.all([
            es.get<Record<string, string>>({ index: testAlertIndex, id: openAlert.id }),
            es.get<Record<string, string>>({ index: testAlertIndex, id: closedAlert.id }),
            es.get<Record<string, string>>({
              index: testAlertIndex,
              id: closedWithReasonAlert.id,
            }),
          ]);

          // Open alert was updated to closed with the case close reason
          expect(openDoc._source?.[ALERT_WORKFLOW_STATUS]).to.eql('closed');
          expect(openDoc._source?.[ALERT_WORKFLOW_REASON]).to.eql('duplicate');

          // Already-closed alert (no reason): untouched
          expect(closedDoc._source?.[ALERT_WORKFLOW_STATUS]).to.eql('closed');
          expect(closedDoc._source?.[ALERT_WORKFLOW_REASON]).to.be(undefined);

          // Already-closed alert with a reason: original reason preserved
          expect(closedWithReasonDoc._source?.[ALERT_WORKFLOW_STATUS]).to.eql('closed');
          expect(closedWithReasonDoc._source?.[ALERT_WORKFLOW_REASON]).to.eql(
            closedWithReasonAlert.initialReason
          );
        } finally {
          await es.indices.delete({ index: testAlertIndex, ignore_unavailable: true });
        }
      });
    });

    describe('non-security-solution owner', () => {
      it('should reject any close reason for a case owned by observabilityFixture', async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({ owner: 'observabilityFixture' })
        );

        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: CaseStatuses.closed,
                closeReason: 'false_positive',
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('should reject a custom close reason for a case owned by observabilityFixture', async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({ owner: 'observabilityFixture' })
        );

        await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: CaseStatuses.closed,
                closeReason: 'some_custom_reason',
              },
            ],
          },
          expectedHttpCode: 400,
        });
      });

      it('should close a case owned by observabilityFixture without a close reason', async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({ owner: 'observabilityFixture' })
        );

        const patchedCases = await updateCase({
          supertest,
          params: {
            cases: [
              {
                id: postedCase.id,
                version: postedCase.version,
                status: CaseStatuses.closed,
              },
            ],
          },
        });

        expect(patchedCases[0].status).to.eql(CaseStatuses.closed);
      });
    });
  });
};
