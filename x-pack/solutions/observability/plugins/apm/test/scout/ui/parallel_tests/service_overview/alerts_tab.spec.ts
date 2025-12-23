/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';

const EXPECTED_CONTROLS = ['Statusactive 1', 'Rule', 'Group', 'Tags'];

test.describe('Service overview alerts tab', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('shows alerts search bar, table, query bar and filter controls', async ({
    page,
    pageObjects: { alertsTab },
  }) => {
    await alertsTab.gotoServiceAlertsPage(
      testData.SERVICE_OPBEANS_JAVA,
      testData.OPBEANS_START_DATE,
      testData.OPBEANS_END_DATE
    );

    await alertsTab.waitForControlsToLoad();

    await test.step('core alerts UI is visible', async () => {
      await expect(alertsTab.globalQueryBar).toBeVisible();
      await expect(alertsTab.alertsTableEmptyState).toBeVisible();
      await expect(page.getByTestId('apmMainTemplateHeaderServiceName')).toHaveText(
        testData.SERVICE_OPBEANS_JAVA
      );
    });

    await test.step('renders the expected filter controls', async () => {
      const controlTitles = await alertsTab.getControlFrameTitles();
      await expect(controlTitles).toHaveCount(4);

      const titles = (await controlTitles.allTextContents()).map((title: string) => title.trim());

      for (const expectedControl of EXPECTED_CONTROLS) {
        expect(titles).toContain(expectedControl);
      }
    });
  });
});
