/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';

async function setAdvancedSetting(
  kbnUrl: { base: string },
  key: string,
  value: string,
  auth: { username: string; password: string }
) {
  const url = `${kbnUrl.base}/internal/kibana/settings`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'e2e_test',
      Authorization: 'Basic ' + Buffer.from(`${auth.username}:${auth.password}`).toString('base64'),
    },
    body: JSON.stringify({ changes: { [key]: value } }),
  });
  if (!response.ok) {
    throw new Error(`Failed to set ${key}: ${response.status} ${response.statusText}`);
  }
}

test.describe(
  'Comparison feature flag',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const editorAuth = { username: 'editor', password: 'changeme' };

    test.describe('when comparison feature is enabled', () => {
      test.beforeEach(async ({ browserAuth, kbnUrl }) => {
        await browserAuth.loginAsEditor();
        await setAdvancedSetting(
          kbnUrl,
          'observability:enableComparisonByDefault',
          'true',
          editorAuth
        );
      });

      test('shows the comparison feature enabled in services overview', async ({
        page,
        kbnUrl,
      }) => {
        await page.goto(`${kbnUrl.app('apm')}/services`);
        await expect(page.locator('input[type="checkbox"]#comparison')).toBeChecked();
        await expect(page.getByTestId('comparisonSelect')).not.toBeDisabled();
      });

      test('shows the comparison feature enabled in dependencies overview', async ({
        page,
        kbnUrl,
      }) => {
        await page.goto(`${kbnUrl.app('apm')}/dependencies`);
        await expect(page.locator('input[type="checkbox"]#comparison')).toBeChecked();
        await expect(page.getByTestId('comparisonSelect')).not.toBeDisabled();
      });

      test('shows the comparison feature enabled in service map overview page', async ({
        page,
        kbnUrl,
      }) => {
        await page.goto(`${kbnUrl.app('apm')}/service-map`);
        await expect(page.locator('input[type="checkbox"]#comparison')).toBeChecked();
        await expect(page.getByTestId('comparisonSelect')).not.toBeDisabled();
      });
    });

    test.describe('when comparison feature is disabled', () => {
      test.beforeEach(async ({ browserAuth, kbnUrl }) => {
        await browserAuth.loginAsEditor();
        await setAdvancedSetting(
          kbnUrl,
          'observability:enableComparisonByDefault',
          'false',
          editorAuth
        );
      });

      test.afterEach(async ({ kbnUrl }) => {
        await setAdvancedSetting(
          kbnUrl,
          'observability:enableComparisonByDefault',
          'true',
          editorAuth
        );
      });

      test('shows the comparison feature disabled in services overview', async ({
        page,
        kbnUrl,
      }) => {
        await page.goto(`${kbnUrl.app('apm')}/services`);
        await expect(page.locator('input[type="checkbox"]#comparison')).not.toBeChecked();
        await expect(page.getByTestId('comparisonSelect')).toBeDisabled();
      });

      test('shows the comparison feature disabled in dependencies overview page', async ({
        page,
        kbnUrl,
      }) => {
        await page.goto(`${kbnUrl.app('apm')}/dependencies`);
        await page.waitForResponse((res) =>
          res.url().includes('/internal/apm/dependencies/top_dependencies')
        );
        await expect(page.locator('input[type="checkbox"]#comparison')).not.toBeChecked();
        await expect(page.getByTestId('comparisonSelect')).toBeDisabled();
      });

      test('shows the comparison feature disabled in service map overview page', async ({
        page,
        kbnUrl,
      }) => {
        await page.goto(`${kbnUrl.app('apm')}/service-map`);
        await expect(page.locator('input[type="checkbox"]#comparison')).not.toBeChecked();
        await expect(page.getByTestId('comparisonSelect')).toBeDisabled();
      });
    });
  }
);
