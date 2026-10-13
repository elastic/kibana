/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from './constants';

/**
 * Waits for a stable app-menu signal so the APM page is considered loaded.
 * Prefer Add data (primary action) — same role Settings played before it moved into More.
 * Alerts is privilege-gated and is not a reliable ready signal for all roles.
 */
export async function waitForApmAppMenuReady(page: ScoutPage): Promise<void> {
  await page
    .getByTestId('apmAddDataHeaderLink')
    .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
}

/**
 * Waits for the APM main container to be visible.
 * This is commonly used to ensure the APM page has fully loaded.
 */
export async function waitForApmMainContainer(page: ScoutPage): Promise<void> {
  await page.testSubj.waitForSelector('apmMainContainer', { timeout: EXTENDED_TIMEOUT });
}

/**
 * Waits for the unified search bar's date picker to mount, regardless of which
 * variant (legacy EuiSuperDatePicker or new DateRangePicker) is rendered. The
 * variant depends on the `enableDateRangePicker` flag and may flip across
 * environments.
 */
export async function waitForSearchBarReady(page: ScoutPage): Promise<void> {
  await page
    .getByTestId('dateRangePickerControlButton')
    .or(page.getByTestId('superDatePickerToggleQuickMenuButton'))
    .waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
}

/**
 * Reads the absolute range the search bar's date picker resolved for its current
 * value, as shown in the tooltip of the picker button (both picker variants
 * render one), and moves the mouse away again so the tooltip closes.
 */
export async function readResolvedDateRange(page: ScoutPage): Promise<string> {
  const pickerButton = page
    .getByTestId('dateRangePickerControlButton')
    .or(page.getByTestId('superDatePickerShowDatesButton'));
  const tooltip = page.getByRole('tooltip');

  await pickerButton.hover();
  await tooltip.waitFor({ state: 'visible' });
  const resolvedRange = (await tooltip.innerText()).trim();

  await page.mouse.move(0, 0);
  await tooltip.waitFor({ state: 'hidden' });

  return resolvedRange;
}

/**
 * Clicks the unified search bar's Refresh button.
 */
export async function clickSearchBarRefresh(page: ScoutPage): Promise<void> {
  await page.getByTestId('querySubmitButton').click();
}

/**
 * Close global EUI toasts when present — they intercept pointer events and break
 * interactions (e.g. Investigate menu) while still visible (#246662 CI flakes).
 */
export async function dismissGlobalToastsIfPresent(page: ScoutPage): Promise<void> {
  await page.components.toast().closeAll();
}
