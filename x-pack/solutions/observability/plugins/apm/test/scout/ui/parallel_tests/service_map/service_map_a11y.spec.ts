/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { tags } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';
import { SERVICE_OPBEANS_JAVA } from '../../fixtures/constants';

test.describe(
  'Service map - accessibility',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { serviceMapPage } }) => {
      await browserAuth.loginAsViewer();
      await serviceMapPage.gotoWithDateSelected(testData.START_DATE, testData.END_DATE);
      await serviceMapPage.waitForMapToLoad();
      await serviceMapPage.dismissPopoverIfOpen();
    });

    test('axe-core automated accessibility checks pass', async ({ page }) => {
      await test.step('service map container has no accessibility violations', async () => {
        await page.testSubj.locator('serviceMapGraph').waitFor({ state: 'visible' });
        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="serviceMapGraph"]'],
        });
        expect(violations).toHaveLength(0);
      });

      await test.step('service map controls have no accessibility violations', async () => {
        const { violations } = await page.checkA11y({
          include: ['[data-testid="rf__controls"]'],
        });
        expect(violations).toHaveLength(0);
      });
    });

    test('focus management and visible indicators work correctly', async ({
      page,
      pageObjects: { serviceMapPage },
    }) => {
      await test.step('nodes have visible focus indicators when focused', async () => {
        await serviceMapPage.waitForServiceNodeToLoad(SERVICE_OPBEANS_JAVA);
        const node = serviceMapPage.getServiceNode(SERVICE_OPBEANS_JAVA);
        await node.focus();
        await expect(node).toBeFocused();
      });

      await test.step('find-in-page: highlight frame while focused, Enter centers match', async () => {
        await serviceMapPage.focusBodyForMapShortcuts();
        await serviceMapPage.openFindInPageWithKeyboardShortcut();
        // Fill the real input (#serviceMapFindInPageInput) so EuiFieldSearch onFocus runs and
        // highlight context updates (filling by layout test-subj alone can leave isFocused false).
        await serviceMapPage.serviceMapFindInPageNativeInput.fill(SERVICE_OPBEANS_JAVA);
        await expect(serviceMapPage.serviceMapFindMatchSummary).toHaveText(/[1-9]/);

        // Highlights are driven only while the find field is focused; centering the map after Enter
        // can move focus and clear highlights, so assert the frame before Enter.
        const highlightFrame =
          serviceMapPage.getActiveFindMatchHighlightFrame(SERVICE_OPBEANS_JAVA);
        await expect(highlightFrame).toBeVisible();
        await expect(highlightFrame).toHaveAttribute('data-search-active-match');

        await serviceMapPage.serviceMapFindInPageNativeInput.press('Enter');
        await serviceMapPage.settleServiceMapLayout();
        await expect(serviceMapPage.serviceMapFindMatchSummary).toHaveText(/[1-9]/);
      });

      await test.step('zoom controls are keyboard accessible', async () => {
        await serviceMapPage.clickFitView();
        await expect(serviceMapPage.zoomInBtnControl).toBeVisible();
        await expect(serviceMapPage.zoomOutBtnControl).toBeVisible();
        await expect(serviceMapPage.fitViewBtn).toBeVisible();
        await serviceMapPage.zoomInBtnControl.focus();
        await page.keyboard.press('Enter');
        await expect(serviceMapPage.mapControls).toBeVisible();
      });
    });

    test('ARIA attributes are properly set for screen readers', async ({
      page,
      pageObjects: { serviceMapPage },
    }) => {
      await test.step('service map container has aria-label describing the content', async () => {
        const serviceMapContainer = page.testSubj.locator('serviceMapGraph');
        await expect(serviceMapContainer).toBeVisible();
        await expect(serviceMapContainer).toHaveAttribute('aria-label', /Service map/);
      });

      await test.step('service nodes have proper role and aria-label', async () => {
        await serviceMapPage.waitForServiceNodeToLoad(SERVICE_OPBEANS_JAVA);
        const interactiveElement = serviceMapPage.getServiceNode(SERVICE_OPBEANS_JAVA);
        await expect(interactiveElement).toHaveAttribute('role', 'button');
        await expect(interactiveElement).toHaveAttribute('aria-label', /service/i);
        await expect(interactiveElement).toHaveAttribute(
          'aria-label',
          new RegExp(SERVICE_OPBEANS_JAVA, 'i')
        );
      });

      await test.step('polite live regions exist for keyboard announcements and find-in-page', async () => {
        const serviceMapContainer = page.testSubj.locator('serviceMapGraph');
        await expect(page.testSubj.locator('serviceMapControlsSearch')).toBeVisible();
        const politeLiveRegions = serviceMapContainer.locator('[aria-live="polite"]');
        await expect(politeLiveRegions).toHaveCount(2);
        await expect(
          serviceMapContainer.locator('[data-test-subj="serviceMapFindMatchSummary"]')
        ).toHaveAttribute('aria-live', 'polite');
      });
    });
  }
);
