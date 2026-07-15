/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../fixtures';
import { EXTENDED_TIMEOUT } from '../fixtures/constants';

const PAGES = [
  { name: 'service inventory', path: '/services' },
  { name: 'dependencies', path: '/dependencies' },
  { name: 'service map', path: '/service-map' },
];

// `observability:enableComparisonByDefault` is a global advanced setting that this
// suite flips per test. It lives in the sequential lane (workers: 1) so its writes
// can't race the `01_home` suite, and resets the value afterwards.
test.describe('Comparison feature flag', { tag: tags.stateful.classic }, () => {
  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ uiSettings }) => {
    await uiSettings.unset('observability:enableComparisonByDefault');
  });

  for (const { name, path } of PAGES) {
    test(`shows comparison enabled on the ${name} page`, async ({
      page,
      uiSettings,
      pageObjects: { navigationPage },
    }) => {
      await uiSettings.set({ 'observability:enableComparisonByDefault': true });
      await navigationPage.gotoApm(path);
      await expect(page.locator('input#comparison[type="checkbox"]')).toBeChecked({
        timeout: EXTENDED_TIMEOUT,
      });
      await expect(page.getByTestId('comparisonSelect')).toBeEnabled();
    });
  }

  for (const { name, path } of PAGES) {
    test(`shows comparison disabled on the ${name} page`, async ({
      page,
      uiSettings,
      pageObjects: { navigationPage },
    }) => {
      await uiSettings.set({ 'observability:enableComparisonByDefault': false });
      await navigationPage.gotoApm(path);
      await expect(page.locator('input#comparison[type="checkbox"]')).not.toBeChecked({
        timeout: EXTENDED_TIMEOUT,
      });
      await expect(page.getByTestId('comparisonSelect')).toBeDisabled();
    });
  }
});
