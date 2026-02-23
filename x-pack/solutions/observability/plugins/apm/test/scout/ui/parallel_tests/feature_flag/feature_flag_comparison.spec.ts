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
  'Comparison feature flag',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test('shows comparison enabled in services overview when feature is on', async ({
      page,
      kbnUrl,
      browserAuth,
      uiSettings,
    }) => {
      await browserAuth.loginAsPrivilegedUser();
      await uiSettings.set({ 'observability:enableComparisonByDefault': true });
      await page.goto(`${kbnUrl.app('apm')}/services`);
      await page.getByTestId('comparisonSelect').waitFor({ state: 'visible' });
      const comparisonCheckbox = page.locator('#comparison');
      await expect(comparisonCheckbox).toBeChecked();
      await expect(page.getByTestId('comparisonSelect')).not.toBeDisabled();
    });

    test('shows comparison enabled in dependencies overview when feature is on', async ({
      page,
      kbnUrl,
      browserAuth,
      uiSettings,
    }) => {
      await browserAuth.loginAsPrivilegedUser();
      await uiSettings.set({ 'observability:enableComparisonByDefault': true });
      await page.goto(`${kbnUrl.app('apm')}/dependencies`);
      await page.getByTestId('comparisonSelect').waitFor({ state: 'visible' });
      const comparisonCheckbox = page.locator('#comparison');
      await expect(comparisonCheckbox).toBeChecked();
      await expect(page.getByTestId('comparisonSelect')).not.toBeDisabled();
    });

    test('shows comparison enabled in service map overview when feature is on', async ({
      page,
      kbnUrl,
      browserAuth,
      uiSettings,
    }) => {
      await browserAuth.loginAsPrivilegedUser();
      await uiSettings.set({ 'observability:enableComparisonByDefault': true });
      await page.goto(`${kbnUrl.app('apm')}/service-map`);
      await page.getByTestId('comparisonSelect').waitFor({ state: 'visible' });
      const comparisonCheckbox = page.locator('#comparison');
      await expect(comparisonCheckbox).toBeChecked();
      await expect(page.getByTestId('comparisonSelect')).not.toBeDisabled();
    });

    test('shows comparison disabled in services overview when feature is off', async ({
      page,
      kbnUrl,
      browserAuth,
      uiSettings,
    }) => {
      await browserAuth.loginAsPrivilegedUser();
      await uiSettings.set({ 'observability:enableComparisonByDefault': false });
      try {
        await page.goto(`${kbnUrl.app('apm')}/services`);
        await page.getByTestId('comparisonSelect').waitFor({ state: 'visible' });
        const comparisonCheckbox = page.locator('#comparison');
        await expect(comparisonCheckbox).not.toBeChecked();
        await expect(page.getByTestId('comparisonSelect')).toBeDisabled();
      } finally {
        await uiSettings.set({ 'observability:enableComparisonByDefault': true });
      }
    });

    test('shows comparison disabled in dependencies overview when feature is off', async ({
      page,
      kbnUrl,
      browserAuth,
      uiSettings,
    }) => {
      await browserAuth.loginAsPrivilegedUser();
      await uiSettings.set({ 'observability:enableComparisonByDefault': false });
      try {
        await page.goto(`${kbnUrl.app('apm')}/dependencies`);
        await page.getByTestId('comparisonSelect').waitFor({ state: 'visible' });
        const comparisonCheckbox = page.locator('#comparison');
        await expect(comparisonCheckbox).not.toBeChecked();
        await expect(page.getByTestId('comparisonSelect')).toBeDisabled();
      } finally {
        await uiSettings.set({ 'observability:enableComparisonByDefault': true });
      }
    });

    test('shows comparison disabled in service map overview when feature is off', async ({
      page,
      kbnUrl,
      browserAuth,
      uiSettings,
    }) => {
      await browserAuth.loginAsPrivilegedUser();
      await uiSettings.set({ 'observability:enableComparisonByDefault': false });
      try {
        await page.goto(`${kbnUrl.app('apm')}/service-map`);
        await page.getByTestId('comparisonSelect').waitFor({ state: 'visible' });
        const comparisonCheckbox = page.locator('#comparison');
        await expect(comparisonCheckbox).not.toBeChecked();
        await expect(page.getByTestId('comparisonSelect')).toBeDisabled();
      } finally {
        await uiSettings.set({ 'observability:enableComparisonByDefault': true });
      }
    });
  }
);
