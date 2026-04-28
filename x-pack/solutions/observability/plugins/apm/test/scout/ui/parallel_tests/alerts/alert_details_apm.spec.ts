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
  LATENCY_THRESHOLD_CONFIG,
  setupAlertForTest,
  cleanupApmAlerts,
} from '../../fixtures/alerts_helpers';

const SERVICE_NAME = 'opbeans-java';
let ruleName: string | undefined;

function createExploreInApmTest(alertIndex: string) {
  return async ({
    page,
    pageObjects: { alertDetailsPage },
    apiServices,
    esClient,
  }: ExtendedScoutTestFixtures & ObltWorkerFixtures) => {
    let alertDocId: string;

    await test.step('set up rule and alert document', async () => {
      const result = await setupAlertForTest({
        apiServices,
        esClient,
        alertIndex,
        config: LATENCY_THRESHOLD_CONFIG,
      });
      ruleName = result.ruleName;
      alertDocId = result.alertDocId;
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

test.describe('Alert details - Explore in APM', () => {
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
    'Stateful - View in APM link from alert details page',
    { tag: tags.stateful.classic },
    createExploreInApmTest(STATEFUL_APM_ALERTS_INDEX)
  );

  test(
    'Serverless - View in APM link from alert details page',
    { tag: tags.serverless.observability.complete },
    createExploreInApmTest(SERVERLESS_APM_ALERTS_INDEX)
  );
});
