/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Locator, ScoutPage } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { EXTENDED_TIMEOUT } from '../constants';

export interface TraceWaterfallFlyout {
  readonly dialog: Locator;
  readonly waterfall: Locator;
  readonly spanDetailFlyout: Locator;
  readonly openInDiscoverLink: Locator;
  readonly openInApmLink: Locator;
  readonly childDocFlyout: {
    readonly errors: {
      readonly section: Locator;
    };
    readonly logMessage: Locator;
    readonly cellPopover: Locator;
    expandFirstValueCell(): Promise<void>;
    ensureCellPopoverOnTop(): Promise<void>;
    closeCellPopover(): Promise<void>;
    close(): Promise<void>;
  };
  open(): Promise<void>;
  clickSpan(spanName: string): Promise<void>;
  clickErrorBadge(itemName: string): Promise<void>;
  openActionsMenu(): Promise<void>;
}

export function createTraceWaterfallFlyout(page: ScoutPage): TraceWaterfallFlyout {
  const dialog = page.getByRole('dialog', { name: 'Full trace waterfall flyout' });
  const spanDetailFlyout = page.getByTestId('apmTraceWaterfallSpanDetailFlyout');
  const aboutTableGrid = spanDetailFlyout.locator('.kbnDocViewer__fieldsGrid');
  const cellPopover = page.locator('.euiDataGridRowCell__popover');

  return {
    dialog,
    waterfall: dialog.getByTestId('waterfall'),
    spanDetailFlyout,
    openInDiscoverLink: page.getByTestId('apmTraceWaterfallOpenInDiscover'),
    openInApmLink: page.getByTestId('apmTraceWaterfallOpenInApm'),

    childDocFlyout: {
      errors: {
        section: spanDetailFlyout.getByTestId('unifiedDocViewerErrorsAccordion'),
      },
      logMessage: spanDetailFlyout.getByTestId('unifiedDocViewLogsOverviewMessage'),
      cellPopover,

      async expandFirstValueCell() {
        await aboutTableGrid.waitFor({ state: 'visible' });

        const valueCell = aboutTableGrid.locator(
          '[data-gridcell-column-id="value"][data-gridcell-row-index="0"]'
        );

        // The EuiDataGrid cell action buttons are hover-revealed and start as
        // `aria-hidden`. On slow targets (e.g. serverless) the grid re-renders
        // mid-interaction, detaching the expand button before the click lands or
        // before the popover opens. Retry the whole reveal -> click -> open
        // sequence, re-acquiring the button each attempt, mirroring the FTR
        // `clickCellExpandButton` retry pattern.
        await expect(async () => {
          if (await cellPopover.isVisible()) {
            return;
          }

          await valueCell.scrollIntoViewIfNeeded();
          await valueCell.hover();
          // Clicking focuses the cell so its action buttons stay visible
          // (aria-hidden=false) instead of flickering during re-renders.
          await valueCell.click();

          const expandButton = valueCell.getByTestId('euiDataGridCellExpandButton');
          await expandButton.scrollIntoViewIfNeeded();
          await expandButton.hover();
          await expandButton.click();

          await cellPopover.waitFor({ state: 'visible', timeout: 5000 });
        }).toPass({ timeout: EXTENDED_TIMEOUT });
      },

      async ensureCellPopoverOnTop() {
        await cellPopover.click({ trial: true });
      },

      async closeCellPopover() {
        await page.keyboard.press('Escape');
        await cellPopover.waitFor({ state: 'hidden' });
      },

      async close() {
        await page.keyboard.press('Escape');
        await spanDetailFlyout.waitFor({ state: 'hidden' });
      },
    },

    async open() {
      const button = page.getByTestId('apmFullTraceButtonViewFullTraceButton');
      await button.click({ timeout: EXTENDED_TIMEOUT });
      await dialog.waitFor({ state: 'visible' });
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

    async openActionsMenu() {
      await page
        .getByTestId('apmTraceWaterfallFlyoutActionsButton')
        .click({ timeout: EXTENDED_TIMEOUT });
      await page.getByTestId('apmTraceWaterfallOpenInDiscover').waitFor({ state: 'visible' });
    },
  };
}
