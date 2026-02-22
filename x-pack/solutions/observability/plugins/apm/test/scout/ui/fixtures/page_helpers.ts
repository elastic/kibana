/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from './constants';

/**
 * Wait for the Kibana loading indicator to disappear, ensuring the page is fully loaded
 * before interacting with it. Uses a .catch() so it doesn't fail when the indicator
 * was never shown (fast navigations).
 */
export async function waitForPageReady(page: ScoutPage): Promise<void> {
  await page.testSubj
    .locator('globalLoadingIndicator')
    .waitFor({ state: 'hidden', timeout: 30_000 })
    .catch(() => {});
}

/**
 * Waits for the APM settings header link to be visible.
 * This is commonly used to ensure the APM page has fully loaded.
 */
export async function waitForApmSettingsHeaderLink(page: ScoutPage): Promise<void> {
  await waitForPageReady(page);
  await page
    .getByTestId('apmSettingsHeaderLink')
    .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
}

/**
 * Waits for the APM main container to be visible.
 * This is commonly used to ensure the APM page has fully loaded.
 */
export async function waitForApmMainContainer(page: ScoutPage): Promise<void> {
  await waitForPageReady(page);
  await page.testSubj.locator('apmMainContainer').waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
}
