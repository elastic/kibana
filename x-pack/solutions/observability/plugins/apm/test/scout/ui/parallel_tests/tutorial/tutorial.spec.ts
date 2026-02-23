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
  'APM tutorial',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth }) => {
      await browserAuth.loginAsViewer();
    });

    test('includes section for APM Server', async ({ page, kbnUrl }) => {
      await page.goto(`${kbnUrl.app('home')}#/tutorial/apm`);
      await expect(page.getByRole('heading', { name: 'APM Server' })).toBeVisible();
      await expect(page.getByText('Linux DEB')).toBeVisible();
      await expect(page.getByText('Linux RPM')).toBeVisible();
      await expect(page.getByText('Other Linux')).toBeVisible();
      await expect(page.getByText('macOS')).toBeVisible();
      await expect(page.getByText('Windows')).toBeVisible();
      await expect(page.getByText('Fleet')).toBeVisible();
    });

    test('includes section for APM Agents', async ({ page, kbnUrl }) => {
      await page.goto(`${kbnUrl.app('home')}#/tutorial/apm`);
      await expect(page.getByRole('heading', { name: 'APM agents' })).toBeVisible();
      await expect(page.getByText('Java')).toBeVisible();
      await expect(page.getByText('RUM')).toBeVisible();
      await expect(page.getByText('Node.js')).toBeVisible();
      await expect(page.getByText('Django')).toBeVisible();
      await expect(page.getByText('Flask')).toBeVisible();
      await expect(page.getByText('Ruby on Rails')).toBeVisible();
      await expect(page.getByText('Rack')).toBeVisible();
      await expect(page.getByText('Go')).toBeVisible();
      await expect(page.getByText('.NET')).toBeVisible();
      await expect(page.getByText('PHP')).toBeVisible();
    });
  }
);
