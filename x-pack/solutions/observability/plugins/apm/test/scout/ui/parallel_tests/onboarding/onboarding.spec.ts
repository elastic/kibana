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
  'APM Onboarding',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.describe('General navigation', () => {
      test.beforeEach(async ({ browserAuth }) => {
        await browserAuth.loginAsEditor();
      });

      test('includes section for APM Agents', async ({ page, kbnUrl }) => {
        await page.goto(`${kbnUrl.app('apm')}/onboarding`);
        await expect(page.getByText('APM Agents')).toBeVisible();
        await expect(page.getByText('Node.js')).toBeVisible();
        await expect(page.getByText('Django')).toBeVisible();
        await expect(page.getByText('Flask')).toBeVisible();
        await expect(page.getByText('Ruby on Rails')).toBeVisible();
        await expect(page.getByText('Rack')).toBeVisible();
        await expect(page.getByText('Go')).toBeVisible();
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

        await page.getByText('Go').click();
        await expect(page.getByText('go get go.elastic.co/apm')).toBeVisible();

        await page.getByText('Java').click();
        await expect(page.getByText('-javaagent')).toBeVisible();

        await page.getByText('.NET').click();
        await expect(page.getByText('Elastic.Apm.NetCoreAll')).toBeVisible();

        await page.getByText('PHP').click();
        await expect(page.getByText('apk add --allow-untrusted <package-file>.apk')).toBeVisible();
      });
    });

    test.describe('check Agent Status', () => {
      test.beforeEach(async ({ browserAuth }) => {
        await browserAuth.loginAsEditor();
      });

      test('when no data is present', async ({ page, kbnUrl }) => {
        await page.goto(`${kbnUrl.app('apm')}/onboarding`);
        await page.getByTestId('checkAgentStatus').click();
        await expect(page.getByTestId('agentStatusWarningCallout')).toBeVisible();
      });
    });

    test.describe('create API Key', () => {
      test('fails to create the key due to missing privileges', async ({
        page,
        kbnUrl,
        browserAuth,
      }) => {
        await browserAuth.loginAsEditor();
        await page.goto(`${kbnUrl.app('apm')}/onboarding`);

        const responsePromise = page.waitForResponse(
          (res) => res.url().includes('/api/apm/agent_keys') && res.request().method() === 'POST'
        );
        await page.getByTestId('createApiKeyAndId').click();
        const response = await responsePromise;
        expect(response.status()).toBe(403);
        await expect(page.getByTestId('apiKeyWarningCallout')).toBeVisible();
      });
    });
  }
);
