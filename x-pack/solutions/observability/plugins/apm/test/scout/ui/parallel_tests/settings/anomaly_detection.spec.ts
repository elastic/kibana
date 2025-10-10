/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, apmAuth } from '../../fixtures';

test.describe('Anomaly Detection - Viewer', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsViewer();
  });

  test('should not be able to modify settings', async ({
    pageObjects: { anomalyDetectionPage },
  }) => {
    await anomalyDetectionPage.goto();
    const createButton = anomalyDetectionPage.getCreateJobButtonLocator();
    await expect(createButton).toBeDisabled();
  });
});

test.describe('Anomaly Detection - Privileged User', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test('should be able to modify settings', async ({
    page,
    pageObjects: { anomalyDetectionPage },
  }) => {
    await anomalyDetectionPage.goto();
    const createButton = anomalyDetectionPage.getCreateJobButtonLocator();
    await expect(createButton).toBeEnabled();

    await test.step('verify create button functionality', async () => {
      await anomalyDetectionPage.clickCreateJobButton();

      // Verify that clicking the button navigates to the job creation flow
      // This could show different content depending on available data
      const pageContent = await page.textContent('body');
      expect(pageContent).toContain('Select environments');
    });
  });
});

test.describe('Anomaly Detection - Admin', { tag: ['@ess'] }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsAdmin();
  });

  test('should be able to modify settings', async ({
    page,
    pageObjects: { anomalyDetectionPage },
  }) => {
    await anomalyDetectionPage.goto();
    const createButton = anomalyDetectionPage.getCreateJobButtonLocator();
    await expect(createButton).toBeEnabled();
    await anomalyDetectionPage.createMlJobs('production');
  });
});

test.describe(
  'Anomaly Detection - APM Read Privileges With Write Settings',
  { tag: ['@ess'] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await apmAuth.loginAsApmReadPrivilegesWithWriteSettings(browserAuth);
    });

    test('should be able to modify settings', async ({
      page,
      pageObjects: { anomalyDetectionPage },
    }) => {
      await anomalyDetectionPage.goto();
      const createButton = anomalyDetectionPage.getCreateJobButtonLocator();
      await expect(createButton).toBeEnabled();

      await test.step('verify create button functionality', async () => {
        await anomalyDetectionPage.clickCreateJobButton();

        // Verify that clicking the button navigates to the job creation flow
        // This could show different content depending on available data
        const pageContent = await page.textContent('body');
        expect(pageContent).toContain('Select environments');
      });
    });
  }
);

test.describe(
  'Anomaly Detection - APM All Privileges Without Write Settings',
  { tag: ['@ess'] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await apmAuth.loginAsApmAllPrivilegesWithoutWriteSettings(browserAuth);
    });

    test('should not be able to modify settings', async ({
      pageObjects: { anomalyDetectionPage },
    }) => {
      await anomalyDetectionPage.goto();
      const createButton = anomalyDetectionPage.getCreateJobButtonLocator();
      await expect(createButton).toBeDisabled();
    });
  }
);
