/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type http from 'http';
import {
  SECURITY_ALERT_ATTACHMENT_TYPE,
  SECURITY_ATTACK_ATTACHMENT_TYPE,
} from '@kbn/cases-plugin/common/constants';
import { CaseStatuses } from '@kbn/cases-plugin/common/types/domain';
import { ALERT_WORKFLOW_REASON, ALERT_WORKFLOW_STATUS } from '@kbn/rule-data-utils';
import { ObjectRemover as ActionsRemover } from '../../../../../alerting_api_integration/common/lib';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  bulkCreateAttachments,
  createCase,
  createCaseWithConnector,
  deleteAllCaseItems,
  getServiceNowSimulationServer,
  pushCase,
  updateCase,
} from '../../../../common/lib/api';
import {
  ALERT_INDEX,
  ATTACK_INDEX,
  deleteAttackDocuments,
  indexAttackDocuments,
} from './attack_documents';

const OWNER = 'securitySolutionFixture';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');

  describe('Attack attachments — case status sync', () => {
    const attackId = 'attack-doc-1';
    const alertIds = ['attack-alert-1', 'attack-alert-2'];

    const attackAttachment = {
      type: SECURITY_ATTACK_ATTACHMENT_TYPE,
      owner: OWNER,
      attachmentId: attackId,
      metadata: {
        title: 'Credential harvesting followed by lateral movement',
        summaryMarkdown: 'An adversary harvested credentials and moved laterally.',
        riskScore: 73,
        alertCount: alertIds.length,
        entityCount: 2,
        index: ATTACK_INDEX,
      },
    };

    const alertAttachments = alertIds.map((alertId) => ({
      type: SECURITY_ALERT_ATTACHMENT_TYPE,
      owner: OWNER,
      attachmentId: alertId,
      metadata: {
        index: ALERT_INDEX,
        rule: { id: 'attack-rule-id', name: 'attack rule' },
      },
    }));

    const indexDetectionDocs = async () => {
      await indexAttackDocuments({ es, attackIds: [attackId], alertIds });
    };

    const getWorkflowFields = async (index: string, id: string) => {
      // The sync runs `_update_by_query` with `conflicts: 'abort'`, which resolves ids through a
      // search rather than a realtime get. Refreshing before each read keeps both this assertion
      // and any follow-up status change working against the latest version, instead of aborting on
      // a conflict with a write the index has not refreshed yet.
      await es.indices.refresh({ index });
      const doc = await es.get<Record<string, string>>({ index, id });
      return {
        status: doc._source?.[ALERT_WORKFLOW_STATUS],
        reason: doc._source?.[ALERT_WORKFLOW_REASON],
      };
    };

    /**
     * Creates a case with sync on and attaches the attack plus its constituent alerts, the
     * way the Attacks page does — one `security.attack` attachment and one `security.alert`
     * attachment per de-anonymised alert.
     */
    const createCaseWithAttack = async () => {
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({
          owner: OWNER,
          settings: { syncAlerts: true, extractObservables: false },
        })
      );

      return bulkCreateAttachments({
        supertest,
        caseId: postedCase.id,
        params: [attackAttachment, ...alertAttachments],
      });
    };

    beforeEach(async () => {
      await indexDetectionDocs();
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
      await deleteAttackDocuments(es);
    });

    it('closes the attack document and its attached alerts when the case is closed', async () => {
      const caseWithAttack = await createCaseWithAttack();

      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: caseWithAttack.id,
              version: caseWithAttack.version,
              status: CaseStatuses.closed,
              closeReason: 'true_positive',
            },
          ],
        },
      });

      const attack = await getWorkflowFields(ATTACK_INDEX, attackId);
      expect(attack.status).to.eql('closed');
      expect(attack.reason).to.eql('true_positive');

      for (const alertId of alertIds) {
        const alert = await getWorkflowFields(ALERT_INDEX, alertId);
        expect(alert.status).to.eql('closed');
        expect(alert.reason).to.eql('true_positive');
      }
    });

    it('acknowledges the attack document when the case moves to in-progress', async () => {
      const caseWithAttack = await createCaseWithAttack();

      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: caseWithAttack.id,
              version: caseWithAttack.version,
              status: CaseStatuses['in-progress'],
            },
          ],
        },
      });

      const attack = await getWorkflowFields(ATTACK_INDEX, attackId);
      expect(attack.status).to.eql('acknowledged');

      for (const alertId of alertIds) {
        const alert = await getWorkflowFields(ALERT_INDEX, alertId);
        expect(alert.status).to.eql('acknowledged');
      }
    });

    it('reopens the attack document when the case is reopened', async () => {
      const caseWithAttack = await createCaseWithAttack();

      const closedCases = await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: caseWithAttack.id,
              version: caseWithAttack.version,
              status: CaseStatuses.closed,
              closeReason: 'other',
            },
          ],
        },
      });

      expect((await getWorkflowFields(ATTACK_INDEX, attackId)).status).to.eql('closed');

      await updateCase({
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

      expect((await getWorkflowFields(ATTACK_INDEX, attackId)).status).to.eql('open');
    });

    it('does not sync the attack document when syncAlerts is off', async () => {
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({
          owner: OWNER,
          settings: { syncAlerts: false, extractObservables: false },
        })
      );

      const caseWithAttack = await bulkCreateAttachments({
        supertest,
        caseId: postedCase.id,
        params: [attackAttachment, ...alertAttachments],
      });

      await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: caseWithAttack.id,
              version: caseWithAttack.version,
              status: CaseStatuses['in-progress'],
            },
          ],
        },
      });

      expect((await getWorkflowFields(ATTACK_INDEX, attackId)).status).to.eql('open');
    });

    it('syncs an attack attached to an already in-progress case', async () => {
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({
          owner: OWNER,
          settings: { syncAlerts: true, extractObservables: false },
        })
      );

      const inProgressCases = await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              status: CaseStatuses['in-progress'],
            },
          ],
        },
      });

      await bulkCreateAttachments({
        supertest,
        caseId: inProgressCases[0].id,
        params: [attackAttachment],
      });

      expect((await getWorkflowFields(ATTACK_INDEX, attackId)).status).to.eql('acknowledged');
    });

    it('does not sync an attack attached to an in-progress case when syncAlerts is off', async () => {
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({
          owner: OWNER,
          settings: { syncAlerts: false, extractObservables: false },
        })
      );

      const inProgressCases = await updateCase({
        supertest,
        params: {
          cases: [
            {
              id: postedCase.id,
              version: postedCase.version,
              status: CaseStatuses['in-progress'],
            },
          ],
        },
      });

      await bulkCreateAttachments({
        supertest,
        caseId: inProgressCases[0].id,
        params: [attackAttachment],
      });

      expect((await getWorkflowFields(ATTACK_INDEX, attackId)).status).to.eql('open');
    });

    it('rejects an attack attached to a closed case', async () => {
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({
          owner: OWNER,
          settings: { syncAlerts: true, extractObservables: false },
        })
      );

      const closedCases = await updateCase({
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

      await bulkCreateAttachments({
        supertest,
        caseId: closedCases[0].id,
        params: [attackAttachment],
        expectedHttpCode: 400,
      });

      expect((await getWorkflowFields(ATTACK_INDEX, attackId)).status).to.eql('open');
    });

    /**
     * `push.ts` closes a case's detections itself when the configuration closes by pushing, on a
     * path `updateCase` never touches. Without this an attack would silently stop being closed by
     * a push and every test above would still be green.
     */
    describe('close by pushing', () => {
      const actionsRemover = new ActionsRemover(supertest);
      let serviceNowSimulatorURL: string = '';
      let serviceNowServer: http.Server;

      before(async () => {
        const { server, url } = await getServiceNowSimulationServer();
        serviceNowServer = server;
        serviceNowSimulatorURL = url;
      });

      after(async () => {
        serviceNowServer.close();
      });

      afterEach(async () => {
        await actionsRemover.removeAll();
      });

      const pushCaseWithAttack = async (syncAlerts: boolean) => {
        const { postedCase, connector } = await createCaseWithConnector({
          supertest,
          serviceNowSimulatorURL,
          actionsRemover,
          configureReq: { closure_type: 'close-by-pushing' },
          createCaseReq: getPostCaseRequest({
            owner: OWNER,
            settings: { syncAlerts, extractObservables: false },
          }),
        });

        await bulkCreateAttachments({
          supertest,
          caseId: postedCase.id,
          params: [attackAttachment, ...alertAttachments],
        });

        await pushCase({ supertest, caseId: postedCase.id, connectorId: connector.id });
      };

      it('closes the attack document and its attached alerts when the push closes the case', async () => {
        await pushCaseWithAttack(true);

        expect((await getWorkflowFields(ATTACK_INDEX, attackId)).status).to.eql('closed');

        for (const alertId of alertIds) {
          expect((await getWorkflowFields(ALERT_INDEX, alertId)).status).to.eql('closed');
        }
      });

      it('does not close the attack document when syncAlerts is off', async () => {
        await pushCaseWithAttack(false);

        expect((await getWorkflowFields(ATTACK_INDEX, attackId)).status).to.eql('open');

        for (const alertId of alertIds) {
          expect((await getWorkflowFields(ALERT_INDEX, alertId)).status).to.eql('open');
        }
      });
    });
  });
};
