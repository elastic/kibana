/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * TEMP — delete before merge. Not a real assertion suite: it drives the service
 * flyout into a few visual states and writes screenshots for the PR's before/after
 * gallery. Run once on this branch pre-migration for "before", then again post-migration
 * with FLYOUT_SHOT_RUN=after for "after". Output lands in the gitignored
 * .playwright-mcp/flyout-migration/<run>/ directory.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';
import { assertFlyoutApmChartsRendered } from '../../fixtures/service_flyout_helpers';
import {
  EXTENDED_TIMEOUT,
  SERVICE_MAP_KUERY_OPBEANS,
  SERVICE_OPBEANS_JAVA,
  SERVICE_OPBEANS_NODE,
} from '../../fixtures/constants';

const RUN = process.env.FLYOUT_SHOT_RUN ?? 'before';
const shotPath = (name: string) => `.playwright-mcp/flyout-migration/${RUN}/${name}.png`;

test.describe(
  'Service flyout — screenshot gallery (TEMP)',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.use({ viewport: { width: 1600, height: 1200 } });

    test.beforeEach(async ({ browserAuth, pageObjects: { serviceMapPage } }) => {
      await browserAuth.loginAsViewer();
      await serviceMapPage.gotoWithDateSelected(testData.START_DATE, testData.END_DATE, {
        kuery: SERVICE_MAP_KUERY_OPBEANS,
      });
      await serviceMapPage.waitForMapToLoad();
      await serviceMapPage.dismissPopoverIfOpen();
      await serviceMapPage.closeOptionsPanelIfOpen();
      await serviceMapPage.settleServiceMapLayout();
    });

    test('captures flyout variations', async ({
      page,
      pageObjects: { serviceMapPage, serviceFlyoutPage },
    }) => {
      await serviceMapPage.clickFitView();
      await serviceMapPage.waitForServiceNodeToLoad(SERVICE_OPBEANS_JAVA);

      await test.step('overview (opbeans-java, APM charts)', async () => {
        await serviceMapPage.openServiceNodeFlyout(SERVICE_OPBEANS_JAVA);
        await expect(serviceFlyoutPage.flyout).toBeVisible();
        await expect(serviceFlyoutPage.content).toBeVisible();
        await assertFlyoutApmChartsRendered(serviceFlyoutPage);
        await expect(serviceFlyoutPage.transactionsSection).toBeVisible({
          timeout: EXTENDED_TIMEOUT,
        });
        await page.screenshot({ path: shotPath('overview-java'), animations: 'disabled' });
      });

      await test.step('footer actions menu open', async () => {
        await serviceFlyoutPage.actions.click();
        // The item subjects are preserved across the migration, so this selector resolves in both
        // the before (ActionsContextMenu) and after (Footer.PrimaryActionMenu) runs.
        await page.testSubj
          .locator('serviceFlyoutActionsMenuItem-openTracesInDiscover')
          .waitFor({ state: 'visible' });
        await page.screenshot({ path: shotPath('footer-menu'), animations: 'disabled' });
        await serviceFlyoutPage.actions.click();
      });

      await test.step('header collapsed on scroll', async () => {
        // Shrink the viewport height so the body overflows, then scroll the flyout's actual scroll
        // container to the bottom. Setting scrollTop fires the scroll event the template's collapse
        // hook listens for; the descendant search avoids depending on EUI's internal class names and
        // tolerates the post-resize relayout via polling. Post-migration the header collapses;
        // pre-migration it does not, so the collapse wait is best-effort.
        await page.setViewportSize({ width: 1600, height: 600 });
        await expect
          .poll(
            () =>
              serviceFlyoutPage.flyout.evaluate((flyout) => {
                const scroller = Array.from(flyout.querySelectorAll('*')).find(
                  (el) =>
                    el.scrollHeight > el.clientHeight + 20 &&
                    /(auto|scroll)/.test(getComputedStyle(el).overflowY)
                );
                if (!scroller) return 0;
                scroller.scrollTop = scroller.scrollHeight;
                return scroller.scrollTop;
              }),
            { timeout: EXTENDED_TIMEOUT }
          )
          .toBeGreaterThan(0);
        await page
          .locator('[data-test-subj="flyoutHeaderCollapsibleRegion"][inert]')
          .waitFor({ state: 'attached', timeout: EXTENDED_TIMEOUT })
          .catch(() => {});
        await page.screenshot({ path: shotPath('header-collapsed'), animations: 'disabled' });
        await page.setViewportSize({ width: 1600, height: 1200 });
      });

      await test.step('nested transaction detail flyout (side-by-side child in shared session)', async () => {
        // Clicking a transaction row opens a child flyout in the same EUI session (shared
        // historyKey). At every width EUI keeps parent + child side by side, each with its
        // own close button — there is no flyout-menu back button in this configuration.
        // Array index (not .first()) keeps the scout no-nth-methods lint happy.
        const [firstExpand] = await page.testSubj
          .locator('apmTransactionsTableExpandButton')
          .all();
        await firstExpand.click();

        const nested = page.testSubj.locator('transactionDetailFlyout');
        await expect(nested).toBeVisible({ timeout: EXTENDED_TIMEOUT });

        // Guard the side-by-side layout: it renders one close button per flyout (parent +
        // child). If the viewport is too narrow the session flips to a stacked layout and this
        // count drops — fail loudly rather than capture the wrong layout.
        await expect(page.testSubj.locator('euiFlyoutCloseButton')).toHaveCount(2);

        await page.screenshot({
          path: shotPath('transaction-detail-nested'),
          animations: 'disabled',
        });

        // Close the child via its own close button (both flyouts expose one), leaving the
        // parent open for the remaining steps.
        await nested.locator('[data-test-subj="euiFlyoutCloseButton"]').click();
        await expect(nested).toBeHidden();
        await expect(serviceFlyoutPage.content).toBeVisible();
      });

      await test.step('overview (opbeans-node, different agent)', async () => {
        await serviceFlyoutPage.close();
        await serviceMapPage.waitForServiceNodeToLoad(SERVICE_OPBEANS_NODE);
        await serviceMapPage.openServiceNodeFlyout(SERVICE_OPBEANS_NODE);
        await expect(serviceFlyoutPage.flyout).toBeVisible();
        await expect(serviceFlyoutPage.content).toBeVisible();
        await page.screenshot({ path: shotPath('overview-node'), animations: 'disabled' });
      });
    });
  }
);
