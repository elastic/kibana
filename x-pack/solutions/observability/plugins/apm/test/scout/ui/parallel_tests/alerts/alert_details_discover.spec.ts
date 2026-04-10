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

function createAlertDetailsDiscoverTest(alertIndex: string) {
  return async ({
    page,
    pageObjects: { alertDetailsPage },
    apiServices,
    esClient,
  }: ExtendedScoutTestFixtures & ObltWorkerFixtures) => {
    let ruleId: string;
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
      await esClient.index({
        index: alertIndex,
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
    });

    await test.step('navigate to alert details page', async () => {
      await alertDetailsPage.goto(alertUuid);
    });

    await test.step('open the chart actions dropdown on the Latency chart', async () => {
      await expect(async () => {
        await expect(alertDetailsPage.getOpenActionsButton('Latency')).toBeVisible();
        await alertDetailsPage.openChartActions('Latency');
      }).toPass({ timeout: 60_000, intervals: [2_000] });
    });

    await test.step('verify "Traces in Discover" action has href with service name', async () => {
      await expect(alertDetailsPage.tracesInDiscoverAction).toBeVisible();

      const href = await alertDetailsPage.getTracesInDiscoverHref();
      expect(href).toBeTruthy();
      expect(decodeURIComponent(href!)).toContain(SERVICE_NAME);
    });

    await test.step('click "Traces in Discover" and verify Discover loads', async () => {
      await alertDetailsPage.clickTracesInDiscover();

      await expect(async () => {
        await expect(page.testSubj.locator('dscPage')).toBeVisible();
      }).toPass({ timeout: 60_000, intervals: [2_000] });
    });
  };
}

test.describe('Alert details - Discover journey', () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ apiServices, esClient }) => {
    await cleanupApmAlerts({ apiServices, esClient, ruleName: RULE_NAME });
  });

  test(
    'Stateful - Opens Discover from alert details page',
    { tag: tags.stateful.classic },
    createAlertDetailsDiscoverTest(STATEFUL_APM_ALERTS_INDEX)
  );

  test(
    'Serverless - Opens Discover from alert details page',
    { tag: tags.serverless.observability.complete },
    createAlertDetailsDiscoverTest(SERVERLESS_APM_ALERTS_INDEX)
  );
});
