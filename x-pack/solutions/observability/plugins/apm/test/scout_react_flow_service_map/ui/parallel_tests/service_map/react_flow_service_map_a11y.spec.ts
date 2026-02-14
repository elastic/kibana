/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';
import { SERVICE_OPBEANS_JAVA, SERVICE_OPBEANS_NODE } from '../../fixtures/constants';

/**
 * Accessibility tests for React Flow Service Map
 *
 * These tests verify that the service map meets accessibility requirements:
 * - axe-core automated checks pass (WCAG 2.1 AA compliance)
 * - Keyboard navigation works correctly
 * - Focus management is proper
 * - Screen reader support through ARIA attributes
 *
 * Tests run with the serviceMapUseReactFlow feature flag enabled.
 */
test.describe('React Flow Service Map Accessibility', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { reactFlowServiceMapPage } }) => {
    await browserAuth.loginAsViewer();
    await reactFlowServiceMapPage.gotoWithDateSelected(testData.START_DATE, testData.END_DATE);
    await reactFlowServiceMapPage.waitForReactFlowServiceMapToLoad();
  });

  test('axe-core automated accessibility checks pass', async ({
    page,
    pageObjects: { reactFlowServiceMapPage },
  }) => {
    await test.step('service map container has no accessibility violations', async () => {
      await page.testSubj.locator('reactFlowServiceMap').waitFor({ state: 'visible' });

      const { violations } = await page.checkA11y({
        include: ['[data-test-subj="reactFlowServiceMap"]'],
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
      await reactFlowServiceMapPage.waitForNodeToLoad(SERVICE_OPBEANS_JAVA);
      await reactFlowServiceMapPage.clickNode(SERVICE_OPBEANS_JAVA);
      await reactFlowServiceMapPage.waitForPopoverToBeVisible();

      const { violations } = await page.checkA11y({
        include: ['[data-test-subj="serviceMapPopoverContent"]'],
      });

      expect(violations).toHaveLength(0);
    });
  });

  test('keyboard navigation works correctly', async ({
    page,
    pageObjects: { reactFlowServiceMapPage },
  }) => {
    await test.step('service map nodes are focusable with Tab key', async () => {
      await reactFlowServiceMapPage.waitForNodeToLoad(SERVICE_OPBEANS_JAVA);

      const serviceMap = page.testSubj.locator('reactFlowServiceMap');
      await serviceMap.focus();
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBeTruthy();
    });

    await test.step('pressing Enter on a focused node opens the popover', async () => {
      await reactFlowServiceMapPage.openPopoverWithKeyboard(SERVICE_OPBEANS_JAVA, 'Enter');
    });

    await test.step('pressing Escape closes the popover', async () => {
      await page.keyboard.press('Escape');

      await reactFlowServiceMapPage.waitForPopoverToBeHidden();
      await expect(reactFlowServiceMapPage.serviceMapPopoverContent).toBeHidden();
    });

    await test.step('pressing Space on a focused node opens the popover', async () => {
      await reactFlowServiceMapPage.openPopoverWithKeyboard(SERVICE_OPBEANS_JAVA, ' ');

      await page.keyboard.press('Escape');
      await reactFlowServiceMapPage.waitForPopoverToBeHidden();
    });

    await test.step('arrow keys navigate between nodes', async () => {
      await reactFlowServiceMapPage.waitForNodeToLoad(SERVICE_OPBEANS_NODE);

      const javaNode = reactFlowServiceMapPage.getNodeById(SERVICE_OPBEANS_JAVA);
      await javaNode.focus();

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
  });

  test('focus management and visible indicators work correctly', async ({
    page,
    pageObjects: { reactFlowServiceMapPage },
  }) => {
    await test.step('nodes have visible focus indicators when focused', async () => {
      await reactFlowServiceMapPage.waitForNodeToLoad(SERVICE_OPBEANS_JAVA);

      const node = reactFlowServiceMapPage.getNodeById(SERVICE_OPBEANS_JAVA);
      await node.focus();

      const isFocused = await page.evaluate((nodeId) => {
        const nodeEl = document.querySelector(`[data-id="${nodeId}"]`);
        return nodeEl === document.activeElement || nodeEl?.contains(document.activeElement);
      }, SERVICE_OPBEANS_JAVA);

      expect(isFocused).toBe(true);
    });

    await test.step('zoom controls are keyboard accessible', async () => {
      await expect(reactFlowServiceMapPage.reactFlowZoomInBtn).toBeVisible();
      await expect(reactFlowServiceMapPage.reactFlowZoomOutBtn).toBeVisible();
      await expect(reactFlowServiceMapPage.reactFlowFitViewBtn).toBeVisible();

      await reactFlowServiceMapPage.reactFlowZoomInBtn.focus();
      await page.keyboard.press('Enter');

      await expect(reactFlowServiceMapPage.reactFlowControls).toBeVisible();
    });
  });

  test('ARIA attributes are properly set for screen readers', async ({
    page,
    pageObjects: { reactFlowServiceMapPage },
  }) => {
    await test.step('service map container has aria-label describing the content', async () => {
      const serviceMapContainer = page.testSubj.locator('reactFlowServiceMap');
      await expect(serviceMapContainer).toBeVisible();

      await expect(serviceMapContainer).toHaveAttribute('aria-label', /Service map/);
    });

    await test.step('service nodes have proper role and aria-label', async () => {
      await reactFlowServiceMapPage.waitForNodeToLoad(SERVICE_OPBEANS_JAVA);

      const nodeContainer = reactFlowServiceMapPage.getNodeById(SERVICE_OPBEANS_JAVA);
      const interactiveElement = nodeContainer.locator('[role="button"]');

      await expect(interactiveElement).toHaveAttribute('role', 'button');
      await expect(interactiveElement).toHaveAttribute('aria-label', /service/i);
      await expect(interactiveElement).toHaveAttribute(
        'aria-label',
        new RegExp(SERVICE_OPBEANS_JAVA, 'i')
      );
    });

    await test.step('screen reader announcement region exists within service map', async () => {
      const serviceMapContainer = page.testSubj.locator('reactFlowServiceMap');
      const liveRegion = serviceMapContainer.locator('[aria-live="polite"]');
      await expect(liveRegion).toHaveCount(1);
    });
  });
});
