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

test.describe(
  'APM Onboarding',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test('includes section for APM Agents', async ({ page, kbnUrl }) => {
      await page.goto(`${kbnUrl.app('apm')}/onboarding`);
      await expect(page.getByRole('heading', { name: 'APM Agents' })).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Node.js' })).toBeVisible();
      await expect(page.getByText('Django')).toBeVisible();
      await expect(page.getByText('Flask')).toBeVisible();
      await expect(page.getByText('Ruby on Rails')).toBeVisible();
      await expect(page.getByText('Rack')).toBeVisible();
      await expect(page.getByRole('tab', { name: 'Go', exact: true })).toBeVisible();
      await expect(page.getByText('Java')).toBeVisible();
      await expect(page.getByText('.NET')).toBeVisible();
      await expect(page.getByText('PHP')).toBeVisible();
    });

    test('navigation to different Tabs', async ({ page, kbnUrl }) => {
      await page.goto(`${kbnUrl.app('apm')}/onboarding`);
      await page.getByText('Django').click();
      await expect(page.getByText('pip install elastic-apm')).toBeVisible();

      await page.getByText('Flask').click();
      await expect(page.getByText('pip install elastic-apm[flask]')).toBeVisible();

      await page.getByText('Ruby on Rails').click();
      await expect(page.getByText("gem 'elastic-apm'")).toBeVisible();

      await page.getByText('Rack').click();
      await expect(page.getByText("gem 'elastic-apm'")).toBeVisible();

      await page.getByRole('tab', { name: 'Go', exact: true }).click();
      await expect(page.getByText('go get go.elastic.co/apm')).toBeVisible();

      await page.getByText('Java').click();
      await expect(page.getByText('-javaagent', { exact: true })).toBeVisible();

      await page.getByText('.NET', { exact: true }).click();
      await expect(page.getByText('Elastic.Apm.NetCoreAll')).toBeVisible();

      await page.getByText('PHP').click();
      await expect(page.getByText('apk add --allow-untrusted <package-file>.apk')).toBeVisible();
    });

    test('check Agent Status when no data is present', async ({ page, kbnUrl }) => {
      await page.goto(`${kbnUrl.app('apm')}/onboarding`);
      await page.getByTestId('checkAgentStatus').click();
      await expect(page.getByTestId('agentStatusWarningCallout')).toBeVisible({
        timeout: EXTENDED_TIMEOUT,
      });
    });

    test('fails to create API key due to missing privileges', async ({
      page,
      kbnUrl,
      browserAuth,
    }) => {
      await browserAuth.loginAsPrivilegedUser();
      await page.goto(`${kbnUrl.app('apm')}/onboarding`);

      const responsePromise = page.waitForResponse(
        (res) => res.url().includes('/api/apm/agent_keys') && res.request().method() === 'POST'
      );
      await page.getByTestId('createApiKeyAndId').click();
      const response = await responsePromise;
      expect(response.status()).toBe(403);
      await expect(page.getByTestId('apiKeyWarningCallout')).toBeVisible();
    });
  }
);
