/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { MAX_OBSERVABLES_PER_CASE, OBSERVABLE_TYPE_IPV4 } from '@kbn/cases-plugin/common/constants';
import type { ObservablesUserAction } from '@kbn/cases-plugin/common/types/domain';
import { AttachmentType, UserActionTypes } from '@kbn/cases-plugin/common/types/domain';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import type { User } from '../../../../common/lib/authentication/types';
import {
  noKibanaPrivileges,
  obsOnly,
  secOnly,
  secOnlyRead,
  superUser,
} from '../../../../common/lib/authentication/users';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  bulkDeleteObservables,
  createCase,
  createComment,
  deleteAllCaseItems,
  extractObservables,
  findCaseUserActions,
  getCase,
} from '../../../../common/lib/api';

const ALERT_INDEX = 'test-cases-extract-observables';
const ALERT_ID = 'extract-observables-alert-id';
const SOURCE_IP = '1.2.3.4';
const EVENT_ID = 'extract-observables-event-id';
const EVENT_SOURCE_IP = '5.6.7.8';
const CAP_ALERT_ID = 'extract-observables-cap-alert-id';
const CAP_SOURCE_IPS = Array.from(
  { length: MAX_OBSERVABLES_PER_CASE + 1 },
  (_, index) => `10.0.0.${index}`
);

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const attachAlert = async (
    caseId: string,
    alertId: string,
    {
      index = ALERT_INDEX,
      auth = { user: superUser, space: null },
    }: { index?: string; auth?: { user: User; space: string | null } } = {}
  ) =>
    createComment({
      supertest,
      caseId,
      auth,
      params: {
        alertId,
        index,
        rule: { id: 'test-rule-id', name: 'test-rule' },
        type: AttachmentType.alert,
        owner: 'securitySolutionFixture',
      },
    });

  const attachEvent = async (caseId: string, eventId: string) =>
    createComment({
      supertest,
      caseId,
      params: {
        eventId,
        index: ALERT_INDEX,
        type: AttachmentType.event,
        owner: 'securitySolutionFixture',
      },
    });

  const indexDocument = async (id: string, sourceIp: string | string[]) =>
    es.index({
      index: ALERT_INDEX,
      id,
      document: { '@timestamp': new Date().toISOString(), source: { ip: sourceIp } },
      refresh: true,
    });

  describe('extract observables', () => {
    before(async () => {
      await indexDocument(ALERT_ID, SOURCE_IP);
      await indexDocument(EVENT_ID, EVENT_SOURCE_IP);
      await indexDocument(CAP_ALERT_ID, CAP_SOURCE_IPS);
    });

    after(async () => {
      await es.indices.delete({ index: ALERT_INDEX }, { ignore: [404] });
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('extracts the observables of the attached alerts that the case does not have yet', async () => {
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: true } })
      );
      const caseWithAlert = await attachAlert(postedCase.id, ALERT_ID);

      // The attach-time extraction already saved the observable. Remove it to extract it again.
      expect(caseWithAlert.observables.map(({ value }) => value)).to.eql([SOURCE_IP]);
      await bulkDeleteObservables({
        supertest,
        caseId: postedCase.id,
        observableIds: caseWithAlert.observables.map(({ id }) => id as string),
      });

      const result = await extractObservables({ supertest, caseId: postedCase.id });

      expect(result.status).to.be('extracted');
      expect(result.newObservablesCount).to.be(1);
      expect(result.alertsRequested).to.be(1);
      expect(result.alertsFound).to.be(1);
      expect(result.case.observables).to.have.length(1);
      expect(result.case.observables[0].value).to.be(SOURCE_IP);
      expect(result.case.observables[0].typeKey).to.be(OBSERVABLE_TYPE_IPV4.key);
      expect(result.case.totalAlerts).to.be(1);

      const { observables } = await getCase({ supertest, caseId: postedCase.id });
      expect(observables).to.have.length(1);

      const { userActions } = await findCaseUserActions({ supertest, caseID: postedCase.id });
      const addUserActions = userActions.filter(
        (userAction) =>
          userAction.type === UserActionTypes.observables &&
          userAction.payload?.observables?.actionType === 'add'
      );
      // One add for the attach-time extraction, one add for the on-demand extraction.
      expect(addUserActions.length).to.be(2);
      const lastAddUserAction = addUserActions[addUserActions.length - 1] as ObservablesUserAction;
      expect(lastAddUserAction.payload.observables.count).to.be(1);
    });

    it('extracts the observables of the attached events', async () => {
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: true } })
      );
      const caseWithEvent = await attachEvent(postedCase.id, EVENT_ID);

      // The attach-time extraction already saved the observable. Remove it to extract it again.
      expect(caseWithEvent.observables.map(({ value }) => value)).to.eql([EVENT_SOURCE_IP]);
      await bulkDeleteObservables({
        supertest,
        caseId: postedCase.id,
        observableIds: caseWithEvent.observables.map(({ id }) => id as string),
      });

      const result = await extractObservables({ supertest, caseId: postedCase.id });

      expect(result.status).to.be('extracted');
      expect(result.newObservablesCount).to.be(1);
      expect(result.alertsRequested).to.be(1);
      expect(result.alertsFound).to.be(1);
      expect(result.case.observables.map(({ value }) => value)).to.eql([EVENT_SOURCE_IP]);
    });

    it('reports cap_reached when the case is full and the alerts have new observables', async () => {
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: true } })
      );
      // The alert has one IP more than the cap. The attach-time extraction saves up to the cap.
      const caseWithAlert = await attachAlert(postedCase.id, CAP_ALERT_ID);
      expect(caseWithAlert.observables).to.have.length(MAX_OBSERVABLES_PER_CASE);

      const result = await extractObservables({ supertest, caseId: postedCase.id });

      expect(result.status).to.be('cap_reached');
      expect(result.newObservablesCount).to.be(0);
      expect(result.alertsFound).to.be(1);
      expect(result.case.observables).to.have.length(MAX_OBSERVABLES_PER_CASE);
    });

    it('reports no_new_observables when the case already has the observables', async () => {
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: true } })
      );
      await attachAlert(postedCase.id, ALERT_ID);

      const result = await extractObservables({ supertest, caseId: postedCase.id });

      expect(result.status).to.be('no_new_observables');
      expect(result.newObservablesCount).to.be(0);
      expect(result.alertsFound).to.be(1);
      expect(result.case.observables).to.have.length(1);
    });

    it('reports alerts_not_found when the case has no alerts or events', async () => {
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: true } })
      );

      const result = await extractObservables({ supertest, caseId: postedCase.id });

      expect(result.status).to.be('alerts_not_found');
      expect(result.newObservablesCount).to.be(0);
      expect(result.alertsRequested).to.be(0);
      expect(result.alertsFound).to.be(0);
    });

    it('reports alerts_not_found when the attached alerts no longer exist', async () => {
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: true } })
      );
      await attachAlert(postedCase.id, 'alert-that-does-not-exist');

      const result = await extractObservables({ supertest, caseId: postedCase.id });

      expect(result.status).to.be('alerts_not_found');
      expect(result.alertsRequested).to.be(1);
      expect(result.alertsFound).to.be(0);
      expect(result.case.observables).to.have.length(0);
    });

    it('reports alerts_not_found when the index of the attached alerts does not exist', async () => {
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: true } })
      );
      await attachAlert(postedCase.id, ALERT_ID, { index: 'index-that-does-not-exist' });

      const result = await extractObservables({ supertest, caseId: postedCase.id });

      expect(result.status).to.be('alerts_not_found');
      expect(result.alertsRequested).to.be(1);
      expect(result.alertsFound).to.be(0);
      expect(result.case.observables).to.have.length(0);
    });

    it('returns 400 and does not change the case when extraction is turned off for the case', async () => {
      const postedCase = await createCase(
        supertest,
        getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: false } })
      );
      await attachAlert(postedCase.id, ALERT_ID);

      await extractObservables({ supertest, caseId: postedCase.id, expectedHttpCode: 400 });

      const { observables } = await getCase({ supertest, caseId: postedCase.id });
      expect(observables).to.have.length(0);
    });

    it('returns 404 when the case does not exist', async () => {
      await extractObservables({
        supertest,
        caseId: 'case-that-does-not-exist',
        expectedHttpCode: 404,
      });
    });

    describe('rbac', () => {
      const space1Auth = { user: superUser, space: 'space1' };

      const createCaseWithAlertInSpace1 = async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: true } }),
          200,
          space1Auth
        );
        await attachAlert(postedCase.id, ALERT_ID, { auth: space1Auth });
        return postedCase;
      };

      it('allows a user that can update the case', async () => {
        const postedCase = await createCaseWithAlertInSpace1();

        const result = await extractObservables({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          auth: { user: secOnly, space: 'space1' },
        });

        expect(result.status).to.be('no_new_observables');
        expect(result.alertsFound).to.be(1);
      });

      for (const { user, description } of [
        { user: secOnlyRead, description: 'can only read the case' },
        { user: obsOnly, description: 'has no access to the owner of the case' },
        { user: noKibanaPrivileges, description: 'has no Kibana privileges' },
      ]) {
        it(`returns 403 for a user that ${description}`, async () => {
          const postedCase = await createCaseWithAlertInSpace1();

          await extractObservables({
            supertest: supertestWithoutAuth,
            caseId: postedCase.id,
            auth: { user, space: 'space1' },
            expectedHttpCode: 403,
          });
        });
      }

      it('returns 404 for a case in another space', async () => {
        const postedCase = await createCaseWithAlertInSpace1();

        await extractObservables({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          auth: { user: superUser, space: 'space2' },
          expectedHttpCode: 404,
        });
      });
    });
  });
};
