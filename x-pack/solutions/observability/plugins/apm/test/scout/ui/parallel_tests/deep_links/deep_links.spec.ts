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

async function searchAndScrollResults(
  page: Parameters<Parameters<typeof test>[2]>[0]['page'],
  kbnUrl: Parameters<Parameters<typeof test>[2]>[0]['kbnUrl'],
  keyword: string
) {
  await page.goto(kbnUrl.get());
  const searchInput = page.getByTestId('nav-search-input');
  await searchInput.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
  await searchInput.fill(keyword);
  await page.getByTestId('euiSelectableList').waitFor({ state: 'visible' });
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
        await searchAndScrollResults(page, kbnUrl, keyword);
        await expect(page.getByText('Applications', { exact: true })).toBeVisible();
        await expect(page.getByText('Applications / Service inventory')).toBeVisible();
        await expect(page.getByText('Applications / Service groups')).toBeVisible();

        const settingsLink = page.getByText('Applications / Settings');
        await settingsLink.scrollIntoViewIfNeeded();
        await expect(page.getByText('Applications / Traces')).toBeVisible();
        await expect(page.getByText('Applications / Service map')).toBeVisible();
        await expect(page.getByText('Applications / Dependencies')).toBeVisible();
        await expect(settingsLink).toBeVisible();
      });

      test(`navigates to Service inventory page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await searchAndScrollResults(page, kbnUrl, keyword);
        await page.getByText('Applications / Service inventory').click();
        await expect(page).toHaveURL(/\/apm\/services/);
      });

      test(`navigates to Service groups page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await searchAndScrollResults(page, kbnUrl, keyword);
        await page.getByText('Applications / Service groups').click();
        await expect(page).toHaveURL(/\/apm\/service-groups/);
      });

      test(`navigates to Traces page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await searchAndScrollResults(page, kbnUrl, keyword);
        const tracesLink = page.getByText('Applications / Traces');
        await tracesLink.scrollIntoViewIfNeeded();
        await tracesLink.click();
        await expect(page).toHaveURL(/\/apm\/traces/);
      });

      test(`navigates to Service map page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await searchAndScrollResults(page, kbnUrl, keyword);
        const serviceMapLink = page.getByText('Applications / Service map');
        await serviceMapLink.scrollIntoViewIfNeeded();
        await serviceMapLink.click();
        await expect(page).toHaveURL(/\/apm\/service-map/);
      });

      test(`navigates to Dependencies page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await searchAndScrollResults(page, kbnUrl, keyword);
        const dependenciesLink = page.getByText('Applications / Dependencies');
        await dependenciesLink.scrollIntoViewIfNeeded();
        await dependenciesLink.click();
        await expect(page).toHaveURL(/\/apm\/dependencies\/inventory/);
      });

      test(`navigates to Settings page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await searchAndScrollResults(page, kbnUrl, keyword);
        const settingsLink = page.getByText('Applications / Settings');
        await settingsLink.scrollIntoViewIfNeeded();
        await settingsLink.click();
        await expect(page).toHaveURL(/\/apm\/settings\/general-settings/);
      });
    }
  }
);
