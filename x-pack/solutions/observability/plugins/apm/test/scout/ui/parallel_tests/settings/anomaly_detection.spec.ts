/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test } from '../../fixtures';
import { PRODUCTION_ENVIRONMENT } from '../../fixtures/constants';

test.describe('Anomaly Detection', { tag: ['@ess', '@svlOblt'] }, () => {
  test('Viewer should not be able to modify settings', async ({
    pageObjects: { anomalyDetectionPage },
    browserAuth,
  }) => {
    await browserAuth.loginAsViewer();
    await anomalyDetectionPage.goto();
    const createButton = anomalyDetectionPage.getCreateJobButtonLocator();
    await expect(createButton).toBeDisabled();
  });

  test('Privileged User should be able to modify settings', async ({
    page,
    pageObjects: { anomalyDetectionPage },
    browserAuth,
  }) => {
    await browserAuth.loginAsPrivilegedUser();
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

  test('Admin should be able to modify settings', async ({
    pageObjects: { anomalyDetectionPage },
    browserAuth,
  }) => {
    await browserAuth.loginAsAdmin();
    await anomalyDetectionPage.goto();
    const createButton = anomalyDetectionPage.getCreateJobButtonLocator();
    await expect(createButton).toBeEnabled();

    await test.step('verify create button functionality', async () => {
      await anomalyDetectionPage.createMlJobs(PRODUCTION_ENVIRONMENT);
    });

    await test.step('verify delete button functionality', async () => {
      await anomalyDetectionPage.deleteMlJob();
    });
  });

  test('APM Read Privileges With Write Settings should be able to modify settings', async ({
    page,
    pageObjects: { anomalyDetectionPage },
    browserAuth,
    config,
  }) => {
    await browserAuth.loginAsApmReadPrivilegesWithWriteSettings();
    await anomalyDetectionPage.goto();
    const createButton = anomalyDetectionPage.getCreateJobButtonLocator();
    // TODO: Test fails in MKI/ECH environments - investigate role permissions
    // eslint-disable-next-line playwright/no-conditional-in-test
    if (!config.isCloud) {
      // eslint-disable-next-line playwright/no-conditional-expect
      await expect(createButton).toBeEnabled();

      await test.step('verify create button functionality', async () => {
        await anomalyDetectionPage.clickCreateJobButton();

        const pageContent = await page.textContent('body');
        // eslint-disable-next-line playwright/no-conditional-expect
        expect(pageContent).toContain('Select environments');
      });
    }
  });

  test('APM All Privileges Without Write Settings should not be able to modify settings', async ({
    pageObjects: { anomalyDetectionPage },
    browserAuth,
  }) => {
    await browserAuth.loginAsApmAllPrivilegesWithoutWriteSettings();
    await anomalyDetectionPage.goto();
    const createButton = anomalyDetectionPage.getCreateJobButtonLocator();
    await expect(createButton).toBeDisabled();
  });
});
