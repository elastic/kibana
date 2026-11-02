/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { visualize, lens } = getPageObjects(['visualize', 'lens']);
  const browser = getService('browser');
  const testSubjects = getService('testSubjects');
  const log = getService('log');

  describe('lens config panel scroll', () => {
    // Use a small window height to force the config panel content to overflow
    const SMALL_WINDOW_HEIGHT = 600;
    let originalWindowSize: { height: number; width: number };

    before(async () => {
      // Store original window size to restore later
      originalWindowSize = await browser.getWindowSize();
    });

    after(async () => {
      // Restore original window size
      await browser.setWindowSize(originalWindowSize.width, originalWindowSize.height);
    });

    /**
     * Helper to verify the config panel is scrollable by using scrollIntoView
     * on a bottom element and checking that its position changes.
     * This tests actual user-facing scroll behavior.
     */
    async function assertConfigPanelIsScrollable(bottomElementTestSubj: string) {
      const bottomElement = await testSubjects.find(bottomElementTestSubj);

      // Get initial position of the bottom element
      // Note: browser.execute receives the raw DOM element, not WebElementWrapper
      const initialTop = await browser.execute(
        (el) => (el as unknown as Element).getBoundingClientRect().top,
        bottomElement
      );
      log.debug(`Initial top position of ${bottomElementTestSubj}: ${initialTop}`);

      // Scroll the element into view
      await browser.execute((el) => {
        (el as unknown as Element).scrollIntoView({ block: 'center', behavior: 'instant' });
      }, bottomElement);

      // Small delay for scroll to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Get new position after scrolling
      const newTop = await browser.execute(
        (el) => (el as unknown as Element).getBoundingClientRect().top,
        bottomElement
      );
      log.debug(`New top position of ${bottomElementTestSubj}: ${newTop}`);

      // If scrolling works, the element's position should have changed
      // (it should have moved up on the screen)
      expect(newTop).to.be.lessThan(
        initialTop,
        `Element "${bottomElementTestSubj}" should move up when scrolled into view. ` +
          `Initial top: ${initialTop}, new top: ${newTop}`
      );
    }

    it('should allow scrolling the config panel with a single layer (no tabs)', async () => {
      // Use a smaller window height to force the config panel to overflow
      log.debug(`Resizing browser to ${originalWindowSize.width}x${SMALL_WINDOW_HEIGHT}`);
      await browser.setWindowSize(originalWindowSize.width, SMALL_WINDOW_HEIGHT);

      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      // Switch to Table visualization which has multiple dimension groups
      // (Rows, Columns, Metrics, Split metrics by) to generate enough content
      await lens.switchToVisualization('lnsDatatable');

      // Add dimensions to create enough content to overflow the config panel
      await lens.configureDimension({
        dimension: 'lnsDatatable_rows > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await lens.configureDimension({
        dimension: 'lnsDatatable_rows > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      await lens.configureDimension({
        dimension: 'lnsDatatable_rows > lns-empty-dimension',
        operation: 'terms',
        field: 'geo.src',
      });

      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.configureDimension({
        dimension: 'lnsDatatable_metrics > lns-empty-dimension',
        operation: 'count',
      });

      // Verify single layer - no tabs should be visible
      await lens.assertLayerCount(1);

      // Verify the config panel is scrollable by scrolling a bottom element into view
      await assertConfigPanelIsScrollable('lnsDatatable_metrics > lns-empty-dimension');
    });

    it('should allow scrolling the config panel with multiple layers (with tabs)', async () => {
      // Use a smaller window height to force the config panel to overflow
      log.debug(`Resizing browser to ${originalWindowSize.width}x${SMALL_WINDOW_HEIGHT}`);
      await browser.setWindowSize(originalWindowSize.width, SMALL_WINDOW_HEIGHT);

      await visualize.navigateToNewVisualization();
      await visualize.clickVisType('lens');

      // Use XY chart which supports multiple layers
      await lens.configureDimension({
        dimension: 'lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'average',
        field: 'bytes',
      });

      await lens.configureDimension({
        dimension: 'lnsXY_splitDimensionPanel > lns-empty-dimension',
        operation: 'terms',
        field: 'ip',
      });

      // Add a second layer to trigger tabs
      await lens.createLayer('data');

      // Verify multiple layers - tabs should be visible
      await lens.assertLayerCount(2);

      // Configure second layer to add more content
      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_xDimensionPanel > lns-empty-dimension',
        operation: 'date_histogram',
        field: '@timestamp',
      });

      await lens.configureDimension({
        dimension: 'lns-layerPanel-1 > lnsXY_yDimensionPanel > lns-empty-dimension',
        operation: 'count',
      });

      // Switch back to first layer and verify scrolling works
      await lens.ensureLayerTabIsActive(0);

      // Verify the config panel is scrollable by scrolling a bottom element into view
      await assertConfigPanelIsScrollable('lnsXY_splitDimensionPanel > lns-dimensionTrigger');
    });
  });
}
