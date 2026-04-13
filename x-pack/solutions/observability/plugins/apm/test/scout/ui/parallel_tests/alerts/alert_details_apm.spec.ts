/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import type { ObltWorkerFixtures } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { faker } from '@faker-js/faker';
import { test } from '../../fixtures';
import type { ExtendedScoutTestFixtures } from '../../fixtures';
import { STATEFUL_APM_ALERTS_INDEX, SERVERLESS_APM_ALERTS_INDEX } from '../../fixtures/constants';
import { createApmAlertDocument, cleanupApmAlerts } from '../../fixtures/alerts_helpers';

const SERVICE_NAME = 'opbeans-java';
const TRANSACTION_TYPE = 'request';
const ENVIRONMENT = 'production';
const RULE_NAME = `Latency threshold ${faker.string.uuid()} ${Date.now()}`;
const RULE_TYPE_ID = 'apm.transaction_duration';

function createAlertDetailsApmTest(alertIndex: string) {
  return async ({
    page,
    pageObjects: { alertDetailsPage },
    apiServices,
    esClient,
  }: ExtendedScoutTestFixtures & ObltWorkerFixtures) => {
    let ruleId: string;
    let alertDocId: string;

    const alertUuid = faker.string.uuid();

    await test.step('create rule via API', async () => {
      const response = await apiServices.alerting.rules.create({
        ruleTypeId: RULE_TYPE_ID,
        name: RULE_NAME,
        consumer: 'apm',
        schedule: { interval: '1m' },
        enabled: false,
        params: {
          serviceName: SERVICE_NAME,
          transactionType: TRANSACTION_TYPE,
          environment: ENVIRONMENT,
          aggregationType: 'avg',
          threshold: 1500,
          windowSize: 5,
          windowUnit: 'm',
        },
        tags: ['apm'],
      });
      ruleId = response.data.id;
    });

    await test.step('index alert document', async () => {
      const response = await esClient.index({
        index: alertIndex,
        op_type: 'create',
        refresh: 'wait_for',
        document: createApmAlertDocument({
          alertUuid,
          ruleId,
          ruleName: RULE_NAME,
          ruleTypeId: RULE_TYPE_ID,
          ruleCategory: 'Latency threshold',
          reason: `Avg. latency is 2,000 ms in the last 5 mins for service: ${SERVICE_NAME}, env: ${ENVIRONMENT}, type: ${TRANSACTION_TYPE}. Alert when > 1,500 ms.`,
          evaluationThreshold: 1500000,
          evaluationValue: 2000000,
          serviceName: SERVICE_NAME,
          environment: ENVIRONMENT,
          processorEvent: 'transaction',
          transactionType: TRANSACTION_TYPE,
        }),
      });

      alertDocId = response._id;
    });

    await test.step('navigate to alert details page', async () => {
      await alertDetailsPage.goto(alertDocId);
    });

    await test.step('open the chart actions dropdown on the Latency chart', async () => {
      await expect(async () => {
        await expect(alertDetailsPage.getOpenActionsButton('Latency')).toBeVisible();
        await alertDetailsPage.openChartActions('Latency');
      }).toPass({ timeout: 60_000, intervals: [2_000] });
    });

    await test.step('verify "In APM" action has a valid redirect href', async () => {
      await expect(alertDetailsPage.viewInApmAction).toBeVisible();

      const apmHref = await alertDetailsPage.getViewInApmHref();
      expect(apmHref).toBeTruthy();
      expect(apmHref).toContain('APM_LOCATOR');
    });

    await test.step('click "In APM" and verify APM service overview loads', async () => {
      await alertDetailsPage.clickViewInApm();

      await expect(async () => {
        expect(page.url()).toContain(`/apm/services/${SERVICE_NAME}/overview`);
        await expect(page.testSubj.locator('apmMainTemplateHeaderServiceName')).toHaveText(
          SERVICE_NAME
        );
      }).toPass({ timeout: 60_000, intervals: [2_000] });
    });
  };
}

test.describe('Alert details - APM journey', () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ apiServices, esClient }) => {
    await cleanupApmAlerts({ apiServices, esClient, ruleName: RULE_NAME });
  });

  test(
    'Stateful - View in APM link from alert details page',
    { tag: tags.stateful.classic },
    createAlertDetailsApmTest(STATEFUL_APM_ALERTS_INDEX)
  );

  test(
    'Serverless - View in APM link from alert details page',
    { tag: tags.serverless.observability.complete },
    createAlertDetailsApmTest(SERVERLESS_APM_ALERTS_INDEX)
  );
});
