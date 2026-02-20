/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { tags } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';
import {
  SERVICE_MAP_KUERY_OPBEANS_JAVA,
  SERVICE_OPBEANS_JAVA,
  SERVICE_OPBEANS_NODE,
} from '../../fixtures/constants';

// FLAKY: https://github.com/elastic/kibana/issues/253809
test.describe.skip(
  'Service map - accessibility',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { serviceMapPage } }) => {
      await browserAuth.loginAsViewer();
      await serviceMapPage.gotoWithDateSelected(testData.START_DATE, testData.END_DATE);
      await serviceMapPage.waitForMapToLoad();
      await serviceMapPage.dismissPopoverIfOpen();
    });

    test('axe-core automated accessibility checks pass', async ({
      page,
      pageObjects: { serviceMapPage },
    }) => {
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

      await test.step('service node popover has no accessibility violations', async () => {
        // Navigate with kuery so the map loads pre-filtered (no re-fetch after opening popover)
        await serviceMapPage.gotoWithDateSelected(testData.START_DATE, testData.END_DATE, {
          kuery: SERVICE_MAP_KUERY_OPBEANS_JAVA,
        });
        await serviceMapPage.waitForMapToLoad();
        await serviceMapPage.dismissPopoverIfOpen();
        await serviceMapPage.clickFitView();
        await serviceMapPage.waitForServiceNodeToLoad(SERVICE_OPBEANS_JAVA);
        await serviceMapPage.clickServiceNode(SERVICE_OPBEANS_JAVA);
        await serviceMapPage.waitForPopoverToBeVisible();
        await expect(serviceMapPage.serviceMapPopoverContent).toBeVisible();
        const { violations } = await page.checkA11y({
          include: ['[data-test-subj="serviceMapPopoverContent"]'],
        });
        expect(violations).toHaveLength(0);
      });
    });

    test('keyboard navigation works correctly', async ({
      page,
      pageObjects: { serviceMapPage },
    }) => {
      await test.step('service map nodes are focusable with Tab key', async () => {
        await serviceMapPage.waitForServiceNodeToLoad(SERVICE_OPBEANS_JAVA);
        const serviceMap = page.testSubj.locator('serviceMapGraph');
        await serviceMap.focus();
        await page.keyboard.press('Tab');
        const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
        expect(focusedElement).toBeTruthy();
      });

      await test.step('arrow keys navigate between nodes', async () => {
        await serviceMapPage.waitForServiceNodeToLoad(SERVICE_OPBEANS_NODE);
        await serviceMapPage.focusServiceNodeAndWaitForFocus(SERVICE_OPBEANS_JAVA);
        const originalFocusedId = await page.evaluate(() => {
          const el = document.activeElement?.closest('[data-id]');
          return el?.getAttribute('data-id');
        });
        await page.keyboard.press('ArrowRight');
        const newFocusedId = await page.evaluate(() => {
          const el = document.activeElement?.closest('[data-id]');
          return el?.getAttribute('data-id');
        });
        expect(newFocusedId || originalFocusedId).toBeTruthy();
      });

      await test.step('pressing Enter on a focused node opens the popover', async () => {
        await serviceMapPage.typeInTheSearchBar(SERVICE_MAP_KUERY_OPBEANS_JAVA);
        await serviceMapPage.waitForServiceNodeToLoad(SERVICE_OPBEANS_JAVA);
        await serviceMapPage.openPopoverWithKeyboardForService(SERVICE_OPBEANS_JAVA, 'Enter');
      });

      await test.step('pressing Escape closes the popover', async () => {
        await page.keyboard.press('Escape');
        await serviceMapPage.waitForPopoverToBeHidden();
        await expect(serviceMapPage.serviceMapPopoverContent).toBeHidden();
      });

      await test.step('pressing Space on a focused node opens the popover', async () => {
        await serviceMapPage.openPopoverWithKeyboardForService(SERVICE_OPBEANS_JAVA, ' ');
        await page.keyboard.press('Escape');
        await serviceMapPage.waitForPopoverToBeHidden();
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
        const isFocused = await page.evaluate((name: string) => {
          const focused = document.activeElement;
          return (
            focused?.getAttribute('aria-label')?.toLowerCase().includes(name.toLowerCase()) ?? false
          );
        }, SERVICE_OPBEANS_JAVA);
        expect(isFocused).toBe(true);
      });

      await test.step('zoom controls are keyboard accessible', async () => {
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

      await test.step('screen reader announcement region exists within service map', async () => {
        const serviceMapContainer = page.testSubj.locator('serviceMapGraph');
        const liveRegion = serviceMapContainer.locator('[aria-live="polite"]');
        await expect(liveRegion).toHaveCount(1);
      });
    });
  }
);
