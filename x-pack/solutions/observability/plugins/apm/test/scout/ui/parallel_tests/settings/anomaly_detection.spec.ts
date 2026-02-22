/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';
import { PRODUCTION_ENVIRONMENT } from '../../fixtures/constants';

test.describe(
  'Anomaly Detection',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
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
        await expect(page.getByText('Select environments')).toBeVisible();
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
      test.skip(config.isCloud, 'Role permissions differ in MKI/ECH environments');

      await browserAuth.loginAsApmReadPrivilegesWithWriteSettings();
      await anomalyDetectionPage.goto();
      const createButton = anomalyDetectionPage.getCreateJobButtonLocator();
      await expect(createButton).toBeEnabled();

      await test.step('verify create button functionality', async () => {
        await anomalyDetectionPage.clickCreateJobButton();
        await expect(page.getByText('Select environments')).toBeVisible();
      });
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
  }
);
