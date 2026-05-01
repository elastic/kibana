/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import type { ObltWorkerFixtures } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import type { ExtendedScoutTestFixtures } from '../../fixtures';
import { STATEFUL_APM_ALERTS_INDEX, SERVERLESS_APM_ALERTS_INDEX } from '../../fixtures/constants';
import {
  type AlertTestConfig,
  LATENCY_THRESHOLD_CONFIG,
  FAILED_TRANSACTION_RATE_CONFIG,
  setupAlertForTest,
  cleanupApmAlerts,
} from '../../fixtures/alerts_helpers';

let ruleName: string | undefined;

function createChartLayoutTest(alertIndex: string, config: AlertTestConfig) {
  return async ({
    pageObjects: { alertDetailsPage },
    apiServices,
    esClient,
  }: ExtendedScoutTestFixtures & ObltWorkerFixtures) => {
    let alertDocId: string;

    await test.step('set up rule and alert document', async () => {
      const result = await setupAlertForTest({ apiServices, esClient, alertIndex, config });
      ruleName = result.ruleName;
      alertDocId = result.alertDocId;
    });

    await test.step('navigate to alert details page', async () => {
      await alertDetailsPage.goto(alertDocId);
    });

    await test.step('verify all chart panels are rendered', async () => {
      await expect(async () => {
        await expect(alertDetailsPage.getChartPanel(config.primaryChartTitle)).toBeVisible();
        for (const title of config.secondaryChartTitles) {
          await expect(alertDetailsPage.getChartPanel(title)).toBeVisible();
        }
      }).toPass({ timeout: 60_000, intervals: [2_000] });
    });

    await test.step('verify chart actions are available on each chart', async () => {
      const allChartTitles = [config.primaryChartTitle, ...config.secondaryChartTitles];
      for (const title of allChartTitles) {
        await expect(alertDetailsPage.getOpenActionsButton(title)).toBeVisible();
      }
    });
  };
}

test.describe('Alert details - Chart layout', () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ apiServices, esClient }) => {
    if (ruleName) {
      await cleanupApmAlerts({ apiServices, esClient, ruleName });
      ruleName = undefined;
    }
  });

  test(
    'Stateful - Latency threshold renders correct chart layout',
    { tag: tags.stateful.classic },
    createChartLayoutTest(STATEFUL_APM_ALERTS_INDEX, LATENCY_THRESHOLD_CONFIG)
  );

  test(
    'Serverless - Latency threshold renders correct chart layout',
    { tag: tags.serverless.observability.complete },
    createChartLayoutTest(SERVERLESS_APM_ALERTS_INDEX, LATENCY_THRESHOLD_CONFIG)
  );

  test(
    'Stateful - Failed transaction rate renders correct chart layout',
    { tag: tags.stateful.classic },
    createChartLayoutTest(STATEFUL_APM_ALERTS_INDEX, FAILED_TRANSACTION_RATE_CONFIG)
  );

  test(
    'Serverless - Failed transaction rate renders correct chart layout',
    { tag: tags.serverless.observability.complete },
    createChartLayoutTest(SERVERLESS_APM_ALERTS_INDEX, FAILED_TRANSACTION_RATE_CONFIG)
  );
});
