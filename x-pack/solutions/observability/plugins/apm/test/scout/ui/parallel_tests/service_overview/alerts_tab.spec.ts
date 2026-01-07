/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';

const EXPECTED_CONTROLS = ['Statusactive1', 'Rule', 'Group', 'Tags'];

test.describe('Service overview alerts tab', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('Is accessible from the default tab', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await test.step('navigate to service details and show alerts tab', async () => {
      await serviceDetailsPage.goToPage();
      await expect(serviceDetailsPage.alertsTab.getTab()).toBeVisible();
    });

    await test.step('navigate to alerts tab', async () => {
      await serviceDetailsPage.alertsTab.clickTab();
      const url = new URL(page.url());
      expect(url.pathname).toContain(`/alerts`);
      await expect(serviceDetailsPage.alertsTab.tab).toHaveAttribute('aria-selected', 'true');
    });
  });

  test('Shows alerts search bar, table, query bar and filter controls', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.alertsTab.goToTab();

    await test.step('core alerts UI is visible', async () => {
      await expect(serviceDetailsPage.alertsTab.globalQueryBar).toBeVisible();
      await expect(serviceDetailsPage.alertsTab.alertsTableEmptyState).toBeVisible();
      await expect(page.getByTestId('apmMainTemplateHeaderServiceName')).toHaveText('opbeans-java');
    });

    await test.step('renders the expected filter controls', async () => {
      const controlTitles = serviceDetailsPage.alertsTab.controlTitles;
      await expect(controlTitles).toHaveCount(4);

      const titles = (await controlTitles.allTextContents()).map((title: string) => title.trim());

      for (const expectedControl of EXPECTED_CONTROLS) {
        expect(titles).toContain(expectedControl);
      }
    });
  });

  test('Has no detectable a11y violations on load', async ({
    page,
    pageObjects: { serviceDetailsPage },
  }) => {
    await serviceDetailsPage.alertsTab.goToTab();
    const { violations } = await page.checkA11y({ include: ['main'] });
    expect(violations).toHaveLength(0);
  });
});
