/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-oblt';
import { EXTENDED_TIMEOUT } from '../constants';

export interface TraceWaterfallFlyout {
  readonly dialog: Locator;
  readonly waterfall: Locator;
  readonly spanDetailFlyout: Locator;
  readonly openInDiscoverLink: Locator;
  readonly openInApmLink: Locator;
  open(): Promise<void>;
  clickSpan(spanName: string): Promise<void>;
  clickErrorBadge(itemName: string): Promise<void>;
  closeDetailFlyout(): Promise<void>;
  openActionsMenu(): Promise<void>;
}

export function createTraceWaterfallFlyout(page: ScoutPage): TraceWaterfallFlyout {
  const dialog = page.getByRole('dialog', { name: 'Full trace waterfall flyout' });
  return {
    dialog,
    waterfall: dialog.getByTestId('waterfall'),
    spanDetailFlyout: page.getByTestId('apmTraceWaterfallSpanDetailFlyout'),
    openInDiscoverLink: page.getByTestId('apmTraceWaterfallOpenInDiscover'),
    openInApmLink: page.getByTestId('apmTraceWaterfallOpenInApm'),

    async open() {
      const button = page.getByTestId('apmFullTraceButtonViewFullTraceButton');
      await button.click({ timeout: EXTENDED_TIMEOUT });
    },

    async clickSpan(spanName: string) {
      await dialog.getByTestId('waterfall').getByText(spanName).click();
    },

    async clickErrorBadge(itemName: string) {
      await dialog
        .getByTestId('waterfall')
        .getByTestId('traceItemRowContent')
        .filter({ hasText: itemName })
        .getByTestId('apmBarDetailsErrorBadge')
        .click();
    },

    async closeDetailFlyout() {
      const detailFlyout = page.getByTestId('apmTraceWaterfallSpanDetailFlyout');
      await page.keyboard.press('Escape');
      await detailFlyout.waitFor({ state: 'hidden' });
    },

    async openActionsMenu() {
      await page
        .getByTestId('apmTraceWaterfallFlyoutActionsButton')
        .click({ timeout: EXTENDED_TIMEOUT });
    },
  };
}
