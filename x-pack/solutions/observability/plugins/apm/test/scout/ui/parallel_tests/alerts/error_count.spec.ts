/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';

const SERVICE_NAME = 'unstable-java';
const START_DATE = 'now-15m';
const END_DATE = 'now';
const RULE_NAME = 'Error count threshold';

test.describe('Alerts', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test.afterEach(async ({ apiServices }) => {
    await apiServices.alerting.cleanup.deleteAllRules();
  });

  test.afterAll(async ({ apiServices }) => {
    await apiServices.alerting.cleanup.deleteAllRules();
  });

  test("Can create, trigger and view an 'Error count' alert from service inventory", async ({
    page,
    pageObjects: { serviceInventoryPage, alertsControls, serviceDetailsPage },
  }) => {
    await test.step('land on service inventory and opens alerts context menu', async () => {
      await serviceInventoryPage.gotoDetailedServiceInventoryWithDateSelected(START_DATE, END_DATE);
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
      await expect(alertsControls.addRuleFlyout.isAboveExpression).toHaveText('is above 0 errors');
    });

    await test.step('create the rule', async () => {
      await alertsControls.addRuleFlyout.jumpToStep('details');
      await alertsControls.addRuleFlyout.saveRule({ saveEmptyActions: true });
      await expect(page.getByTestId('euiToastHeader')).toHaveText(`Created rule "${RULE_NAME}"`);
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
});
