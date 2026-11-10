/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { OBSERVABLE_TYPE_IPV4 } from '@kbn/cases-plugin/common/constants';
import { AttachmentType } from '@kbn/cases-plugin/common/types/domain';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { secOnlyRead, superUser } from '../../../../common/lib/authentication/users';
import { getPostCaseRequest } from '../../../../common/lib/mock';
import {
  bulkDeleteObservables,
  createCase,
  createComment,
  deleteAllCaseItems,
  extractObservables,
  getCase,
} from '../../../../common/lib/api';

const ALERT_INDEX = 'test-cases-extract-observables';
const ALERT_ID = 'extract-observables-alert-id';
const SOURCE_IP = '1.2.3.4';

export default ({ getService }: FtrProviderContext): void => {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');

  const attachAlert = async (caseId: string, alertId: string) =>
    createComment({
      supertest,
      caseId,
      params: {
        alertId,
        index: ALERT_INDEX,
        rule: { id: 'test-rule-id', name: 'test-rule' },
        type: AttachmentType.alert,
        owner: 'securitySolutionFixture',
      },
    });

  describe('extract observables', () => {
    before(async () => {
      await es.index({
        index: ALERT_INDEX,
        id: ALERT_ID,
        document: { '@timestamp': new Date().toISOString(), source: { ip: SOURCE_IP } },
        refresh: true,
      });
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

      const { observables } = await getCase({ supertest, caseId: postedCase.id });
      expect(observables).to.have.length(1);
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
      it('returns 403 for a user that cannot update the case', async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: true } })
        );
        await attachAlert(postedCase.id, ALERT_ID);

        await extractObservables({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          auth: { user: secOnlyRead, space: null },
          expectedHttpCode: 403,
        });
      });

      it('allows a user that can update the case', async () => {
        const postedCase = await createCase(
          supertest,
          getPostCaseRequest({ settings: { syncAlerts: false, extractObservables: true } })
        );

        await extractObservables({
          supertest: supertestWithoutAuth,
          caseId: postedCase.id,
          auth: { user: superUser, space: null },
        });
      });
    });
  });
};
