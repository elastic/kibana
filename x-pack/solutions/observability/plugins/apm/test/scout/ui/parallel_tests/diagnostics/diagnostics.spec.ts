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
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

const DIAGNOSTICS_BUNDLE = path.resolve(
  __dirname,
  '../../fixtures/diagnostics/apm-diagnostics-8.8.0-1687436214804.json'
);

test.describe('Diagnostics', { tag: tags.stateful.classic }, () => {
  test('shows OK status badges on the summary tab as a superuser', async ({
    browserAuth,
    pageObjects: { diagnosticsPage },
  }) => {
    await browserAuth.loginAsAdmin();
    await diagnosticsPage.goto();

    await expect(diagnosticsPage.getBadge('integrationPackageStatus_Badge')).toHaveText('OK', {});
    await expect(diagnosticsPage.getBadge('indexTemplatesStatus_Badge')).toHaveText('OK');
    await expect(diagnosticsPage.getBadge('dataStreamsStatus_Badge')).toHaveText('Warning');
    await expect(diagnosticsPage.getBadge('fieldMappingStatus_Badge')).toHaveText('Warning');
  });

  test('imports a diagnostics bundle and can remove it as a superuser', async ({
    browserAuth,
    pageObjects: { diagnosticsPage },
  }) => {
    await browserAuth.loginAsAdmin();
    await diagnosticsPage.importBundle(DIAGNOSTICS_BUNDLE);
    await expect(diagnosticsPage.removeReportButton).toBeVisible({ timeout: EXTENDED_TIMEOUT });

    await diagnosticsPage.clearBundle();
    await expect(diagnosticsPage.removeReportButton).toBeHidden();
  });

  test('shows the imported bundle in the summary and template/data stream/index tabs as a superuser', async ({
    browserAuth,
    pageObjects: { diagnosticsPage },
  }) => {
    await browserAuth.loginAsAdmin();
    await diagnosticsPage.importBundle(DIAGNOSTICS_BUNDLE);

    await test.step('summary tab reflects the imported integration package', async () => {
      await diagnosticsPage.clickTab('summary-tab');
      await expect(diagnosticsPage.getBadge('integrationPackageStatus_Content')).toHaveText(
        'APM integration (8.8.0)',
        { timeout: EXTENDED_TIMEOUT }
      );
    });

    await test.step('index templates tab is populated', async () => {
      await diagnosticsPage.clickTab('index-templates-tab');
      await diagnosticsPage.expectTableRendered();
    });

    await test.step('data streams tab is populated', async () => {
      await diagnosticsPage.clickTab('data-streams-tab');
      await diagnosticsPage.expectTableRendered();
    });

    await test.step('indices tab is populated', async () => {
      await diagnosticsPage.clickTab('indices-tab');
      await diagnosticsPage.expectTableRendered('indicedWithProblems');
      await diagnosticsPage.expectTableRendered('indicedWithoutProblems');
    });
  });

  test('shows a missing-privileges warning on the summary tab as a viewer', async ({
    browserAuth,
    page,
    pageObjects: { diagnosticsPage },
  }) => {
    await browserAuth.loginAsViewer();
    await diagnosticsPage.goto();
    await expect(
      page.getByText('Not all features are available due to missing privileges.')
    ).toBeVisible({ timeout: EXTENDED_TIMEOUT });
  });

  test('hides the tabs that require cluster privileges as a viewer', async ({
    browserAuth,
    page,
    pageObjects: { diagnosticsPage },
  }) => {
    await browserAuth.loginAsViewer();
    await diagnosticsPage.goto();

    const tabs = page.getByTestId('apmDiagnosticsTemplate').locator('.euiTabs .euiTab');
    await expect(tabs).toHaveText(['Summary', 'Documents', 'Import/Export'], {
      timeout: EXTENDED_TIMEOUT,
    });
  });

  test('shows the imported bundle documents tab as a viewer', async ({
    browserAuth,
    pageObjects: { diagnosticsPage },
  }) => {
    await browserAuth.loginAsViewer();
    await diagnosticsPage.importBundle(DIAGNOSTICS_BUNDLE);
    await diagnosticsPage.clickTab('documents-tab');
    await diagnosticsPage.expectTableRendered('documents-table');
  });
});
