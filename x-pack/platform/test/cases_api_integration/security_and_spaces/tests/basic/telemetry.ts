/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { CasesTelemetry } from '@kbn/cases-plugin/server/telemetry/types';
import { getPostCaseRequest, postCommentAlertReq } from '../../../common/lib/mock';
import {
  deleteAllCaseItems,
  createCase,
  getTelemetry,
  runTelemetryTask,
  createComment,
  bulkCreateAttachments,
} from '../../../common/lib/api';
import type { FtrProviderContext } from '../../../../common/ftr_provider_context';
import { superUser } from '../../../common/lib/authentication/users';

// Helper function to extract cases telemetry data from the response
const getCasesTelemetry = (telemetryResponse: any): CasesTelemetry => {
  return telemetryResponse.stats.stack_stats.kibana.plugins.cases;
};

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const es = getService('es');
  const retry = getService('retry');

  describe('Cases telemetry', () => {
    before(async () => {
      await deleteAllCaseItems(es);
    });

    afterEach(async () => {
      await deleteAllCaseItems(es);
    });

    it('should count cases from all spaces', async () => {
      await createCase(supertest, getPostCaseRequest(), 200, {
        user: superUser,
        space: 'space1',
      });

      await createCase(supertest, getPostCaseRequest(), 200, {
        user: superUser,
        space: 'space2',
      });

      await runTelemetryTask(supertest);

      await retry.try(async () => {
        const res = await getTelemetry(supertest);
        const casesTelemetry = getCasesTelemetry(res);
        expect(casesTelemetry.cases.all.total).toBe(2);
      });
    });

    it('should return the correct total number of alerts attached to cases', async () => {
      const firstCase = await createCase(
        supertest,
        getPostCaseRequest({ owner: 'securitySolution' })
      );
      const secondCase = await createCase(
        supertest,
        getPostCaseRequest({ owner: 'securitySolution' })
      );

      const firstCaseAlerts = [...Array(3).keys()].map((num) => `test-case-1-${num}`);
      const secondCaseAlerts = [...Array(2).keys()].map((num) => `test-case-2-${num}`);

      await bulkCreateAttachments({
        supertest,
        caseId: firstCase.id,
        params: [
          {
            ...postCommentAlertReq,
            alertId: firstCaseAlerts,
            index: firstCaseAlerts,
            owner: 'securitySolution',
          },
        ],
        expectedHttpCode: 200,
      });

      await bulkCreateAttachments({
        supertest,
        caseId: firstCase.id,
        params: [
          {
            ...postCommentAlertReq,
            alertId: secondCaseAlerts,
            index: secondCaseAlerts,
            owner: 'securitySolution',
          },
        ],
        expectedHttpCode: 200,
      });

      await createComment({
        supertest,
        caseId: secondCase.id,
        params: {
          ...postCommentAlertReq,
          alertId: 'test-case-2-3',
          index: 'test-case-2-3',
          owner: 'securitySolution',
        },
      });

      await runTelemetryTask(supertest);

      await retry.try(async () => {
        const res = await getTelemetry(supertest);
        const casesTelemetry = getCasesTelemetry(res);
        expect(casesTelemetry.alerts.all.total).toBe(6);
      });
    });

    it('should return the correct telemetry for cases with observables', async () => {
      await createCase(supertest, getPostCaseRequest({ owner: 'securitySolution' }), 200, {
        user: superUser,
        space: 'space1',
      });

      await createCase(supertest, getPostCaseRequest({ owner: 'securitySolution' }), 200, {
        user: superUser,
        space: 'space2',
      });

      await runTelemetryTask(supertest);

      await retry.try(async () => {
        const res = await getTelemetry(supertest);
        const casesTelemetry = getCasesTelemetry(res);
        const allCasesTelemetry = casesTelemetry.cases.all;
        const securityCasesTelemetry = casesTelemetry.cases.sec;

        for (const telemetry of [allCasesTelemetry, securityCasesTelemetry]) {
          expect(telemetry.observables.manual.default).toBe(0);
          expect(telemetry.observables.auto.default).toBe(0);
          expect(telemetry.observables.total).toBe(0);
          expect(telemetry.totalWithMaxObservables).toBe(0);
        }
      });
    });
  });
};
