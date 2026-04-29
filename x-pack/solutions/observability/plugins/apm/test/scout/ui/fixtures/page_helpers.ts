/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from './constants';

/**
 * Waits for the APM settings header link to be visible.
 * This is commonly used to ensure the APM page has fully loaded.
 */
export async function waitForApmSettingsHeaderLink(page: ScoutPage): Promise<void> {
  await page
    .getByTestId('apmSettingsHeaderLink')
    .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
}

/**
 * Waits for the APM main container to be visible.
 * This is commonly used to ensure the APM page has fully loaded.
 */
export async function waitForApmMainContainer(page: ScoutPage): Promise<void> {
  await page.testSubj.waitForSelector('apmMainContainer', { timeout: EXTENDED_TIMEOUT });
}
