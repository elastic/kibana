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

async function openSearchAndType(
  page: Parameters<Parameters<typeof test>[2]>[0]['page'],
  kbnUrl: Parameters<Parameters<typeof test>[2]>[0]['kbnUrl'],
  keyword: string
) {
  await page.goto(kbnUrl.get());
  await page.testSubj
    .locator('nav-search-input')
    .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  await page.testSubj.fill('nav-search-input', keyword);
  await page.getByTestId('euiSelectableList').waitFor({ state: 'visible' });
}

function getSearchOption(page: Parameters<Parameters<typeof test>[2]>[0]['page'], urlPath: string) {
  return page.locator(`[data-test-subj="nav-search-option"][url*="${urlPath}"]`);
}

test.describe(
  'Applications deep links',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    for (const keyword of ['apm', 'applications']) {
      test(`contains all expected deep links for "${keyword}"`, async ({ page, kbnUrl }) => {
        await openSearchAndType(page, kbnUrl, keyword);
        await expect(getSearchOption(page, '/app/apm/services')).toBeVisible();
        await expect(getSearchOption(page, '/app/apm/service-groups')).toBeVisible();

        const settingsOption = getSearchOption(page, '/app/apm/settings');
        await settingsOption.scrollIntoViewIfNeeded();
        await expect(getSearchOption(page, '/app/apm/traces')).toBeVisible();
        await expect(getSearchOption(page, '/app/apm/service-map')).toBeVisible();
        await expect(getSearchOption(page, '/app/apm/dependencies')).toBeVisible();
        await expect(settingsOption).toBeVisible();
      });

      test(`navigates to Service inventory page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await openSearchAndType(page, kbnUrl, keyword);
        await getSearchOption(page, '/app/apm/services').click();
        await expect(page).toHaveURL(/\/apm\/services/);
      });

      test(`navigates to Service groups page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await openSearchAndType(page, kbnUrl, keyword);
        await getSearchOption(page, '/app/apm/service-groups').click();
        await expect(page).toHaveURL(/\/apm\/service-groups/);
      });

      test(`navigates to Traces page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await openSearchAndType(page, kbnUrl, keyword);
        const tracesOption = getSearchOption(page, '/app/apm/traces');
        await tracesOption.scrollIntoViewIfNeeded();
        await tracesOption.click();
        await expect(page).toHaveURL(/\/apm\/traces/);
      });

      test(`navigates to Service map page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await openSearchAndType(page, kbnUrl, keyword);
        const serviceMapOption = getSearchOption(page, '/app/apm/service-map');
        await serviceMapOption.scrollIntoViewIfNeeded();
        await serviceMapOption.click();
        await expect(page).toHaveURL(/\/apm\/service-map/);
      });

      test(`navigates to Dependencies page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await openSearchAndType(page, kbnUrl, keyword);
        const dependenciesOption = getSearchOption(page, '/app/apm/dependencies');
        await dependenciesOption.scrollIntoViewIfNeeded();
        await dependenciesOption.click();
        await expect(page).toHaveURL(/\/apm\/dependencies\/inventory/);
      });

      test(`navigates to Settings page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await openSearchAndType(page, kbnUrl, keyword);
        const settingsOption = getSearchOption(page, '/app/apm/settings');
        await settingsOption.scrollIntoViewIfNeeded();
        await settingsOption.click();
        await expect(page).toHaveURL(/\/apm\/settings\/general-settings/);
      });
    }
  }
);
