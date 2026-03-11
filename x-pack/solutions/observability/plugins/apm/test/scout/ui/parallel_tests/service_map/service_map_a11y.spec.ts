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
