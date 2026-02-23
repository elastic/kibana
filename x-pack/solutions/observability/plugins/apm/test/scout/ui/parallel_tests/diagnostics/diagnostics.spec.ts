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
  '../../../../../ftr_e2e/cypress/e2e/diagnostics/apm-diagnostics-8.8.0-1687436214804.json'
);

test.describe(
  'Diagnostics',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test('superuser can display summary tab when no data is loaded', async ({
      page,
      kbnUrl,
      browserAuth,
    }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(`${kbnUrl.app('apm')}/diagnostics`);
      await expect(page.getByTestId('integrationPackageStatus_Badge')).toHaveText('OK');
      await expect(page.getByTestId('dataStreamsStatus_Badge')).toHaveText('OK');
      await expect(page.getByTestId('indexTemplatesStatus_Badge')).toHaveText('OK');
      await expect(page.getByTestId('fieldMappingStatus_Badge')).toHaveText(/OK|Warning/);
    });

    test('superuser sees remove button after importing a file', async ({
      page,
      kbnUrl,
      browserAuth,
    }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(`${kbnUrl.app('apm')}/diagnostics/import-export`);
      await page.locator('#file-picker').setInputFiles(DIAGNOSTICS_BUNDLE_PATH);
      await expect(page.getByTestId('apmImportCardRemoveReportButton')).toBeVisible();
      await page.getByTestId('apmTemplateDescriptionClearBundleButton').click();
      await expect(page.getByTestId('apmImportCardRemoveReportButton')).not.toBeVisible();
    });

    test('superuser can display summary tab after importing a file', async ({
      page,
      kbnUrl,
      browserAuth,
    }) => {
      await browserAuth.loginAsAdmin();
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

    test('superuser can display index template tab after importing a file', async ({
      page,
      kbnUrl,
      browserAuth,
    }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(`${kbnUrl.app('apm')}/diagnostics/import-export`);
      await page.locator('#file-picker').setInputFiles(DIAGNOSTICS_BUNDLE_PATH);
      await page.getByTestId('index-templates-tab').click();
      await expect(page.getByRole('row')).toHaveCount(20);
    });

    test('superuser can display data streams tab after importing a file', async ({
      page,
      kbnUrl,
      browserAuth,
    }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(`${kbnUrl.app('apm')}/diagnostics/import-export`);
      await page.locator('#file-picker').setInputFiles(DIAGNOSTICS_BUNDLE_PATH);
      await page.getByTestId('data-streams-tab').click();
      await expect(page.getByRole('row')).toHaveCount(9);
    });

    test('superuser can display indices tab after importing a file', async ({
      page,
      kbnUrl,
      browserAuth,
    }) => {
      await browserAuth.loginAsAdmin();
      await page.goto(`${kbnUrl.app('apm')}/diagnostics/import-export`);
      await page.locator('#file-picker').setInputFiles(DIAGNOSTICS_BUNDLE_PATH);
      await page.getByTestId('indices-tab').click();

      const indicesWithProblems = page.getByTestId('indicedWithProblems');
      const indicesWithoutProblems = page.getByTestId('indicedWithoutProblems');
      await expect(indicesWithProblems.getByRole('row')).toHaveCount(139);
      await expect(indicesWithoutProblems.getByRole('row')).toHaveCount(28);
    });

    test('viewer sees warning about missing privileges when no data is loaded', async ({
      page,
      kbnUrl,
      browserAuth,
    }) => {
      await browserAuth.loginAsViewer();
      await page.goto(`${kbnUrl.app('apm')}/diagnostics`);
      await expect(page.getByText('Not all features are available')).toBeVisible();
    });

    test('viewer sees only tabs that do not require cluster privileges', async ({
      page,
      kbnUrl,
      browserAuth,
    }) => {
      await browserAuth.loginAsViewer();
      await page.goto(`${kbnUrl.app('apm')}/diagnostics`);
      const tabs = ['Summary', 'Documents', 'Import/Export'];
      const diagnosticsTemplate = page.getByTestId('apmDiagnosticsTemplate');

      for (const tabName of tabs) {
        await expect(diagnosticsTemplate.getByRole('tab', { name: tabName })).toBeVisible();
      }
    });

    test('viewer can display documents tab for the imported bundle', async ({
      page,
      kbnUrl,
      browserAuth,
    }) => {
      await browserAuth.loginAsViewer();
      await page.goto(`${kbnUrl.app('apm')}/diagnostics/import-export`);
      await page.locator('#file-picker').setInputFiles(DIAGNOSTICS_BUNDLE_PATH);
      await page.getByTestId('documents-tab').click();

      const documentsTable = page.getByTestId('documents-table');
      await expect(documentsTable.getByRole('row')).toHaveCount(11);
    });
  }
);
