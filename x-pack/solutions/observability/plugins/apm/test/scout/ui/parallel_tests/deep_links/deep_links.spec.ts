/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';

test.describe(
  'Applications deep links',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    for (const keyword of ['apm', 'applications']) {
      test(`contains all expected deep links for "${keyword}"`, async ({ page, kbnUrl }) => {
        await page.goto(kbnUrl.get());
        const searchInput = page.getByTestId('nav-search-input');
        await searchInput.waitFor({ state: 'visible' });
        await searchInput.fill(keyword);
        await expect(page.getByText('Applications')).toBeVisible();
        await expect(page.getByText('Applications / Service inventory')).toBeVisible();
        await expect(page.getByText('Applications / Service groups')).toBeVisible();
        await expect(page.getByText('Applications / Traces')).toBeVisible();
        await expect(page.getByText('Applications / Service map')).toBeVisible();
        await expect(page.getByText('Applications / Dependencies')).toBeVisible();
        await expect(page.getByText('Applications / Settings')).toBeVisible();
      });

      test(`navigates to Service inventory page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await page.goto(kbnUrl.get());
        const searchInput = page.getByTestId('nav-search-input');
        await searchInput.waitFor({ state: 'visible' });
        await searchInput.fill(keyword);
        await page.getByText('Applications / Service inventory').click();
        await expect(page).toHaveURL(/\/apm\/services/);
      });

      test(`navigates to Service groups page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await page.goto(kbnUrl.get());
        const searchInput = page.getByTestId('nav-search-input');
        await searchInput.waitFor({ state: 'visible' });
        await searchInput.fill(keyword);
        await page.getByText('Applications / Service groups').click();
        await expect(page).toHaveURL(/\/apm\/service-groups/);
      });

      test(`navigates to Traces page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await page.goto(kbnUrl.get());
        const searchInput = page.getByTestId('nav-search-input');
        await searchInput.waitFor({ state: 'visible' });
        await searchInput.fill(keyword);
        await page.getByText('Applications / Traces').click();
        await expect(page).toHaveURL(/\/apm\/traces/);
      });

      test(`navigates to Service map page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await page.goto(kbnUrl.get());
        const searchInput = page.getByTestId('nav-search-input');
        await searchInput.waitFor({ state: 'visible' });
        await searchInput.fill(keyword);
        await page.getByText('Applications / Service map').click();
        await expect(page).toHaveURL(/\/apm\/service-map/);
      });

      test(`navigates to Dependencies page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await page.goto(kbnUrl.get());
        const searchInput = page.getByTestId('nav-search-input');
        await searchInput.waitFor({ state: 'visible' });
        await searchInput.fill(keyword);
        const dependenciesLink = page.getByText('Applications / Dependencies');
        await dependenciesLink.scrollIntoViewIfNeeded();
        await dependenciesLink.click();
        await expect(page).toHaveURL(/\/apm\/dependencies\/inventory/);
      });

      test(`navigates to Settings page for "${keyword}"`, async ({ page, kbnUrl }) => {
        await page.goto(kbnUrl.get());
        const searchInput = page.getByTestId('nav-search-input');
        await searchInput.waitFor({ state: 'visible' });
        await searchInput.fill(keyword);
        const settingsLink = page.getByText('Applications / Settings');
        await settingsLink.scrollIntoViewIfNeeded();
        await settingsLink.click();
        await expect(page).toHaveURL(/\/apm\/settings\/general-settings/);
      });
    }
  }
);
