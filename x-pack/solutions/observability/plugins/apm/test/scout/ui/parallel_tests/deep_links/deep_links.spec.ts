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
      test.describe(`Deep links for ${keyword} keyword`, () => {
        test('contains all the expected deep links', async ({ page, kbnUrl }) => {
          await page.goto(kbnUrl.base);
          await page.waitForLoadState('networkidle');
          await page.getByTestId('nav-search-input').fill(keyword);
          await expect(page.getByText('Applications')).toBeVisible();
          await expect(page.getByText('Applications / Service inventory')).toBeVisible();
          await expect(page.getByText('Applications / Service groups')).toBeVisible();
          await page
            .getByTestId('euiSelectableList')
            .locator('div > div')
            .first()
            .scrollIntoViewIfNeeded();
          await expect(page.getByText('Applications / Traces')).toBeVisible();
          await expect(page.getByText('Applications / Service map')).toBeVisible();
          await page.getByTestId('euiSelectableList').locator('div > div').last().scrollIntoViewIfNeeded();
          await expect(page.getByText('Applications / Dependencies')).toBeVisible();
          await expect(page.getByText('Applications / Settings')).toBeVisible();
        });

        test('navigates to Service inventory page', async ({ page, kbnUrl }) => {
          await page.goto(kbnUrl.base);
          await page.waitForLoadState('networkidle');
          await page.getByTestId('nav-search-input').fill(keyword);
          await page.getByText('Applications / Service inventory').click();
          await expect(page).toHaveURL(/\/apm\/services/);
        });

        test('navigates to Service groups page', async ({ page, kbnUrl }) => {
          await page.goto(kbnUrl.base);
          await page.waitForLoadState('networkidle');
          await page.getByTestId('nav-search-input').fill(keyword);
          await page.getByText('Applications / Service groups').click();
          await expect(page).toHaveURL(/\/apm\/service-groups/);
        });

        test('navigates to Traces page', async ({ page, kbnUrl }) => {
          await page.goto(kbnUrl.base);
          await page.waitForLoadState('networkidle');
          await page.getByTestId('nav-search-input').fill(keyword);
          await page.getByText('Applications / Traces').click();
          await expect(page).toHaveURL(/\/apm\/traces/);
        });

        test('navigates to Service map page', async ({ page, kbnUrl }) => {
          await page.goto(kbnUrl.base);
          await page.waitForLoadState('networkidle');
          await page.getByTestId('nav-search-input').fill(keyword);
          await page.getByText('Applications / Service map').click();
          await expect(page).toHaveURL(/\/apm\/service-map/);
        });

        test('navigates to Dependencies page', async ({ page, kbnUrl }) => {
          await page.goto(kbnUrl.base);
          await page.waitForLoadState('networkidle');
          await page.getByTestId('nav-search-input').fill(keyword);
          await page.getByText('Applications / Dependencies').first().scrollIntoViewIfNeeded();
          await page.getByText('Applications / Dependencies').first().click();
          await expect(page).toHaveURL(/\/apm\/dependencies\/inventory/);
        });

        test('navigates to Settings page', async ({ page, kbnUrl }) => {
          await page.goto(kbnUrl.base);
          await page.waitForLoadState('networkidle');
          await page.getByTestId('nav-search-input').fill(keyword);
          await page.getByText('Applications / Settings').first().scrollIntoViewIfNeeded();
          await page.getByText('Applications / Settings').first().click();
          await expect(page).toHaveURL(/\/apm\/settings\/general-settings/);
        });
      });
    }
  }
);
