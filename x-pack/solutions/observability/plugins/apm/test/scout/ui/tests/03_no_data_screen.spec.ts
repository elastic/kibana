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

const APM_INDICES_SAVED_OBJECT_TYPE = 'apm-indices';
const APM_INDICES_SAVED_OBJECT_ID = 'apm-indices';

// Pointing every APM index at a pattern that matches nothing forces the no-data
// screen. This mutates the global `apm-indices` saved object, so the suite lives
// in the sequential lane (dedicated server, workers: 1) where it can't blank out
// APM data for the parallel data suites. It runs last in this lane and restores
// defaults afterwards.
const NON_MATCHING_INDICES = {
  error: 'foo-*',
  onboarding: 'foo-*',
  span: 'foo-*',
  transaction: 'foo-*',
  metric: 'foo-*',
};

test.describe('APM no data screen', { tag: tags.stateful.classic }, () => {
  test.beforeAll(async ({ kbnClient }) => {
    await kbnClient.request({
      method: 'POST',
      path: '/internal/apm-sources/settings/apm-indices/save',
      headers: { 'kbn-xsrf': 'scout' },
      body: NON_MATCHING_INDICES,
    });
  });

  test.beforeEach(async ({ browserAuth }) => {
    await browserAuth.loginAsPrivilegedUser();
  });

  test.afterAll(async ({ kbnClient }) => {
    await kbnClient.savedObjects
      .delete({ type: APM_INDICES_SAVED_OBJECT_TYPE, id: APM_INDICES_SAVED_OBJECT_ID })
      .catch(() => {});
  });

  test('shows the no data screen instead of the service inventory', async ({
    page,
    pageObjects: { navigationPage },
  }) => {
    await navigationPage.gotoApm('/');
    await expect(page.getByTestId('noDataDefaultActionButton')).toBeVisible({
      timeout: EXTENDED_TIMEOUT,
    });
  });

  test('bypasses the no data screen on settings pages', async ({
    page,
    pageObjects: { navigationPage },
  }) => {
    await navigationPage.gotoApm('/settings');
    await expect(page.getByText('Welcome to Elastic Observability!')).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Settings', level: 1 })).toBeVisible({
      timeout: EXTENDED_TIMEOUT,
    });
  });
});
