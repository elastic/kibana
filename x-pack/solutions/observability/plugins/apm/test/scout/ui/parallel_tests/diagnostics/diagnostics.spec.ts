/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import path from 'path';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';

const DIAGNOSTICS_BUNDLE_PATH = path.join(
  __dirname,
  '../../../../../../ftr_e2e/cypress/e2e/diagnostics/apm-diagnostics-8.8.0-1687436214804.json'
);

test.describe(
  'Diagnostics',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.describe('when logging in as superuser', () => {
      test.beforeEach(async ({ browserAuth }) => {
        await browserAuth.loginAsAdmin();
      });

      test.describe('when no data is loaded', () => {
        test('can display summary tab for superuser', async ({ page, kbnUrl }) => {
          await page.goto(`${kbnUrl.app('apm')}/diagnostics`);
          await expect(page.getByTestId('integrationPackageStatus_Badge')).toHaveText('OK');
          await expect(page.getByTestId('dataStreamsStatus_Badge')).toHaveText('OK');
          await expect(page.getByTestId('indexTemplatesStatus_Badge')).toHaveText('OK');
          await expect(page.getByTestId('fieldMappingStatus_Badge')).toHaveText('OK');
        });
      });

      test.describe('when importing a file', () => {
        test('shows the remove button', async ({ page, kbnUrl }) => {
          await page.goto(`${kbnUrl.app('apm')}/diagnostics/import-export`);
          await page.locator('#file-picker').setInputFiles(DIAGNOSTICS_BUNDLE_PATH);
          await expect(page.getByTestId('apmImportCardRemoveReportButton')).toBeVisible();
          await page.getByTestId('apmTemplateDescriptionClearBundleButton').click();
          await expect(page.getByTestId('apmImportCardRemoveReportButton')).not.toBeVisible();
        });

        test('can display summary tab', async ({ page, kbnUrl }) => {
          await page.goto(`${kbnUrl.app('apm')}/diagnostics/import-export`);
          await page.locator('#file-picker').setInputFiles(DIAGNOSTICS_BUNDLE_PATH);
          await page.getByTestId('summary-tab').click();
          await expect(page.getByTestId('integrationPackageStatus_Badge')).toHaveText('OK');
          await expect(page.getByTestId('integrationPackageStatus_Content')).toHaveText(
            /APM integration \([\d.]+\)/
          );
          await expect(page.getByTestId('dataStreamsStatus_Badge')).toHaveText('OK');
          await expect(page.getByTestId('indexTemplatesStatus_Badge')).toHaveText('OK');
          await expect(page.getByTestId('fieldMappingStatus_Badge')).toHaveText('Warning');
        });

        test('can display index template tab', async ({ page, kbnUrl }) => {
          await page.goto(`${kbnUrl.app('apm')}/diagnostics/import-export`);
          await page.locator('#file-picker').setInputFiles(DIAGNOSTICS_BUNDLE_PATH);
          await page.getByTestId('index-templates-tab').click();
          await expect(page.locator('.euiTableRow')).toHaveCount(19);
        });

        test('can display data streams tab', async ({ page, kbnUrl }) => {
          await page.goto(`${kbnUrl.app('apm')}/diagnostics/import-export`);
          await page.locator('#file-picker').setInputFiles(DIAGNOSTICS_BUNDLE_PATH);
          await page.getByTestId('data-streams-tab').click();
          await expect(page.locator('.euiTableRow')).toHaveCount(8);
        });

        test('can display indices tab', async ({ page, kbnUrl }) => {
          await page.goto(`${kbnUrl.app('apm')}/diagnostics/import-export`);
          await page.locator('#file-picker').setInputFiles(DIAGNOSTICS_BUNDLE_PATH);
          await page.getByTestId('indices-tab').click();
          await expect(page.getByTestId('indicedWithProblems').locator('.euiTableRow')).toHaveCount(
            138
          );
          await expect(
            page.getByTestId('indicedWithoutProblems').locator('.euiTableRow')
          ).toHaveCount(27);
        });
      });
    });

    test.describe('when logging in as "viewer" user', () => {
      test.beforeEach(async ({ browserAuth }) => {
        await browserAuth.loginAsViewer();
      });

      test.describe('when no data is loaded', () => {
        test('displays a warning on "summary" tab about missing privileges', async ({
          page,
          kbnUrl,
        }) => {
          await page.goto(`${kbnUrl.app('apm')}/diagnostics`);
          await expect(
            page
              .locator('.euiPanel > .euiText')
              .filter({ hasText: 'Not all features are available' })
          ).toBeVisible();
        });

        test('hides the tabs that require cluster privileges', async ({ page, kbnUrl }) => {
          await page.goto(`${kbnUrl.app('apm')}/diagnostics`);
          const tabs = ['Summary', 'Documents', 'Import/Export'];
          const tabElements = page
            .getByTestId('apmDiagnosticsTemplate')
            .locator('.euiTabs .euiTab');
          for (let i = 0; i < tabs.length; i++) {
            await expect(tabElements.nth(i)).toHaveText(tabs[i]);
          }
        });
      });

      test.describe('when importing a file', () => {
        test('displays documents tab for the imported bundle', async ({ page, kbnUrl }) => {
          await page.goto(`${kbnUrl.app('apm')}/diagnostics/import-export`);
          await page.locator('#file-picker').setInputFiles(DIAGNOSTICS_BUNDLE_PATH);
          await page.getByTestId('documents-tab').click();
          await expect(page.getByTestId('documents-table').locator('.euiTableRow')).toHaveCount(10);
        });
      });
    });
  }
);
