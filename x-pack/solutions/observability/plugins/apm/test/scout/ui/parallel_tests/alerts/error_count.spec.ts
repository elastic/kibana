/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

const SERVICE_NAME = 'unstable-java';
const START_DATE = 'now-15m';
const END_DATE = 'now';
const RULE_NAME = 'Error count threshold';

test.describe(
  'Alerts',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsAdmin();
    });

    test.afterEach(async ({ apiServices }) => {
      await apiServices.alerting.cleanup.deleteAllRules();
    });

    test("Can create, trigger and view an 'Error count' alert from service inventory", async ({
      page,
      pageObjects: { serviceInventoryPage, alertsControls, serviceDetailsPage },
      apiServices,
    }) => {
      await test.step('land on service inventory and opens alerts context menu', async () => {
        await serviceInventoryPage.gotoServiceInventory({
          rangeFrom: START_DATE,
          rangeTo: END_DATE,
        });
        await alertsControls.openContextMenu();
      });

      await test.step('select error count rule', async () => {
        await expect(alertsControls.errorCountItem).toBeVisible();
        await alertsControls.openErrorCountFlyout();
      });

      await test.step('fill rule definition step', async () => {
        await expect(
          alertsControls.addRuleFlyout.flyout.getByRole('heading', { name: RULE_NAME })
        ).toBeVisible();
        await alertsControls.addRuleFlyout.fillIsAbove(0);
        await expect(alertsControls.addRuleFlyout.isAboveExpression).toHaveText(
          'is above 0 errors'
        );
      });

      await test.step('create the rule', async () => {
        await alertsControls.addRuleFlyout.jumpToStep('details');
        await alertsControls.addRuleFlyout.saveRule({ saveEmptyActions: true });
        await expect(page.getByTestId('euiToastHeader')).toHaveText(`Created rule "${RULE_NAME}"`);
      });

      await test.step('wait for the rule to be executed', async () => {
        const foundResponse = await apiServices.alerting.rules.find({
          search: RULE_NAME,
          search_fields: ['name'],
          per_page: 1,
          page: 1,
        });
        const alert = foundResponse.data.data.find((obj: any) => obj.name === RULE_NAME);
        expect(alert).toBeDefined();
        const runDate = new Date();
        await apiServices.alerting.rules.runSoon(alert!.id);
        await apiServices.alerting.waiting.waitForExecutionCount(
          alert!.id,
          1,
          undefined,
          EXTENDED_TIMEOUT,
          runDate
        );
      });

      await test.step('see alert in service alerts tab', async () => {
        await serviceDetailsPage.alertsTab.goToTab({
          serviceName: SERVICE_NAME,
          rangeFrom: START_DATE,
          rangeTo: END_DATE,
        });
        // Enter full screen mode to ensure reason cell is fully rendered
        await serviceDetailsPage.alertsTab.alertsTable.openFullScreenMode();
        const reasonCell = serviceDetailsPage.alertsTab.alertsTable.getCellLocatorByColId(
          0,
          'kibana.alert.reason'
        );
        await expect(reasonCell).toBeVisible();
        await reasonCell.getByRole('button').click();
        await expect(page.getByRole('dialog').getByText(`Rule: ${RULE_NAME}`)).toBeVisible();
      });
    });
  }
);
