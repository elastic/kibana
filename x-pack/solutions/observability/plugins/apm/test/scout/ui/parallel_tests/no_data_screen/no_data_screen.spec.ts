/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test } from '../../fixtures';

async function setApmIndices(
  kbnUrl: { get: () => string },
  body: Record<string, string>,
  auth: { username: string; password: string }
) {
  const url = `${kbnUrl.get()}/internal/apm-sources/settings/apm-indices/save`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'kbn-xsrf': 'e2e_test',
      Authorization: 'Basic ' + Buffer.from(`${auth.username}:${auth.password}`).toString('base64'),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Failed to set APM indices: ${response.status} ${response.statusText}`);
  }
}

test.describe(
  'No data screen',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    const editorAuth = { username: 'editor', password: 'changeme' };

    test.describe('bypass no data screen on settings pages', () => {
      test.beforeAll(async ({ kbnUrl }) => {
        await setApmIndices(
          kbnUrl,
          {
            error: 'foo-*',
            onboarding: 'foo-*',
            span: 'foo-*',
            transaction: 'foo-*',
            metric: 'foo-*',
          },
          editorAuth
        );
      });

      test.beforeEach(async ({ browserAuth }) => {
        await browserAuth.loginAsPrivilegedUser();
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

      test.afterAll(async ({ kbnUrl }) => {
        await setApmIndices(
          kbnUrl,
          {
            error: '',
            onboarding: '',
            span: '',
            transaction: '',
            metric: '',
          },
          editorAuth
        );
      });
    });
  }
);
