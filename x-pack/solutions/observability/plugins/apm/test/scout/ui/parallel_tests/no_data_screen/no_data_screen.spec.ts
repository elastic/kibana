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
  'No data screen - bypass on settings pages',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeAll(async ({ kbnClient }) => {
      await kbnClient.request({
        method: 'POST',
        path: '/internal/apm-sources/settings/apm-indices/save',
        body: {
          error: 'foo-*',
          onboarding: 'foo-*',
          span: 'foo-*',
          transaction: 'foo-*',
          metric: 'foo-*',
        },
      });
    });

    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsPrivilegedUser();
    });

    test.afterAll(async ({ kbnClient }) => {
      await kbnClient.request({
        method: 'POST',
        path: '/internal/apm-sources/settings/apm-indices/save',
        body: {
          error: '',
          onboarding: '',
          span: '',
          transaction: '',
          metric: '',
        },
      });
    });

    test('shows no data screen instead of service inventory', async ({ page, kbnUrl }) => {
      await page.goto(`${kbnUrl.app('apm')}/`);
      await expect(page.getByText('Add data')).toBeVisible();
    });

    test('shows settings page', async ({ page, kbnUrl }) => {
      await page.goto(`${kbnUrl.app('apm')}/settings`);
      await expect(page.getByText('Welcome to Elastic Observability!')).not.toBeVisible();
      await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible();
    });
  }
);
