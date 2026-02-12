/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';
import {
  SERVICE_OPBEANS_JAVA,
  SERVICE_OPBEANS_NODE,
  DEPENDENCY_POSTGRESQL,
} from '../../fixtures/constants';

/**
 * React Flow Service Map tests
 *
 * These tests run with the serviceMapUseReactFlow feature flag enabled.
 * The custom server config is defined in:
 * src/platform/packages/shared/kbn-scout/src/servers/configs/custom/react_flow_service_map/
 */
test.describe(
  'React Flow Service Map',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { reactFlowServiceMapPage } }) => {
      await browserAuth.loginAsViewer();
      await reactFlowServiceMapPage.gotoWithDateSelected(testData.START_DATE, testData.END_DATE);
      await reactFlowServiceMapPage.waitForReactFlowServiceMapToLoad();
    });

    test('renders service map with controls', async ({
      pageObjects: { reactFlowServiceMapPage },
    }) => {
      await expect(reactFlowServiceMapPage.reactFlowServiceMap).toBeVisible();
      await expect(reactFlowServiceMapPage.reactFlowControls).toBeVisible();
      await expect(reactFlowServiceMapPage.reactFlowZoomInBtn).toBeVisible();
      await expect(reactFlowServiceMapPage.reactFlowZoomOutBtn).toBeVisible();
      await expect(reactFlowServiceMapPage.reactFlowFitViewBtn).toBeVisible();

      await test.step('zoom controls are interactive', async () => {
        await expect(reactFlowServiceMapPage.reactFlowControls).toBeVisible();

        await reactFlowServiceMapPage.clickReactFlowZoomIn();
        await reactFlowServiceMapPage.clickReactFlowZoomOut();
        await reactFlowServiceMapPage.clickReactFlowFitView();

        await expect(reactFlowServiceMapPage.reactFlowControls).toBeVisible();
      });

      await reactFlowServiceMapPage.waitForNodeToLoad(SERVICE_OPBEANS_JAVA);

      await test.step('service nodes from opbeans data', async () => {
        const opbeansJavaNode = reactFlowServiceMapPage.getNodeById(SERVICE_OPBEANS_JAVA);
        await expect(opbeansJavaNode).toBeVisible();

        const opbeansNodeNode = reactFlowServiceMapPage.getNodeById(SERVICE_OPBEANS_NODE);
        await expect(opbeansNodeNode).toBeVisible();
      });

      await test.step('edges connecting services', async () => {
        const edgeId = `${SERVICE_OPBEANS_JAVA}~>${SERVICE_OPBEANS_NODE}`;
        const edge = reactFlowServiceMapPage.getEdgeById(edgeId);
        await expect(edge).toBeVisible();
      });
    });

    test('shows popover when clicking on a service node', async ({
      pageObjects: { reactFlowServiceMapPage },
    }) => {
      await reactFlowServiceMapPage.waitForNodeToLoad(SERVICE_OPBEANS_JAVA);

      await reactFlowServiceMapPage.clickNode(SERVICE_OPBEANS_JAVA);

      await reactFlowServiceMapPage.waitForPopoverToBeVisible();
      await expect(reactFlowServiceMapPage.serviceMapPopover).toBeVisible();

      const popoverTitle = await reactFlowServiceMapPage.getPopoverTitle();
      expect(popoverTitle).toContain(SERVICE_OPBEANS_JAVA);

      const serviceDetailsLink = reactFlowServiceMapPage.serviceMapServiceDetailsButton;

      await expect(serviceDetailsLink).toBeVisible();

      const focusMapLink = reactFlowServiceMapPage.serviceMapFocusMapButton;
      await expect(focusMapLink).toBeVisible();
    });

    test('dismisses popover when clicking outside', async ({
      pageObjects: { reactFlowServiceMapPage },
    }) => {
      await reactFlowServiceMapPage.waitForNodeToLoad(SERVICE_OPBEANS_JAVA);

      await reactFlowServiceMapPage.clickNode(SERVICE_OPBEANS_JAVA);
      await reactFlowServiceMapPage.waitForPopoverToBeVisible();
      await expect(reactFlowServiceMapPage.serviceMapPopoverContent).toBeVisible();

      // Click any button outside the popover to dismiss it (Fit View button for example)
      await reactFlowServiceMapPage.clickReactFlowFitView();
      await reactFlowServiceMapPage.waitForNodeToLoad(SERVICE_OPBEANS_JAVA);

      await reactFlowServiceMapPage.waitForPopoverToBeHidden();
      await expect(reactFlowServiceMapPage.serviceMapPopoverContent).toBeHidden();
    });

    test('shows popover when clicking on an edge', async ({
      pageObjects: { reactFlowServiceMapPage },
    }) => {
      const edgeId = `${SERVICE_OPBEANS_JAVA}~>${SERVICE_OPBEANS_NODE}`;
      await reactFlowServiceMapPage.waitForEdgeToLoad(edgeId);

      await reactFlowServiceMapPage.clickEdge(edgeId);

      await reactFlowServiceMapPage.waitForPopoverToBeVisible();
      await expect(reactFlowServiceMapPage.serviceMapPopoverContent).toBeVisible();

      const popoverTitle = await reactFlowServiceMapPage.getPopoverTitle();
      expect(popoverTitle).toContain(`${SERVICE_OPBEANS_JAVA} → >${SERVICE_OPBEANS_NODE}`);
    });

    test('shows popover when clicking on a dependency node', async ({
      pageObjects: { reactFlowServiceMapPage },
    }) => {
      await reactFlowServiceMapPage.waitForNodeToLoad(`>${DEPENDENCY_POSTGRESQL}`);

      await reactFlowServiceMapPage.clickNode(`>${DEPENDENCY_POSTGRESQL}`);

      await reactFlowServiceMapPage.waitForPopoverToBeVisible();
      await expect(reactFlowServiceMapPage.serviceMapPopoverContent).toBeVisible();

      const popoverTitle = await reactFlowServiceMapPage.getPopoverTitle();
      expect(popoverTitle).toContain(DEPENDENCY_POSTGRESQL);
      await expect(reactFlowServiceMapPage.serviceMapDependencyDetailsButton).toBeVisible();
    });

    test('navigates to Service Details from popover', async ({
      page,
      pageObjects: { reactFlowServiceMapPage },
    }) => {
      await reactFlowServiceMapPage.waitForNodeToLoad(SERVICE_OPBEANS_JAVA);
      await reactFlowServiceMapPage.clickNode(SERVICE_OPBEANS_JAVA);
      await reactFlowServiceMapPage.waitForPopoverToBeVisible();

      await reactFlowServiceMapPage.serviceMapServiceDetailsButton.click();

      await expect(page).toHaveURL(
        new RegExp(`/app/apm/services/${SERVICE_OPBEANS_JAVA}/overview`)
      );

      await page.goBack();
      await reactFlowServiceMapPage.waitForReactFlowServiceMapToLoad();
      await expect(reactFlowServiceMapPage.reactFlowServiceMap).toBeVisible();
    });

    test('navigates to Focus Map from popover', async ({
      page,
      pageObjects: { reactFlowServiceMapPage },
    }) => {
      await reactFlowServiceMapPage.waitForNodeToLoad(SERVICE_OPBEANS_JAVA);
      await reactFlowServiceMapPage.clickNode(SERVICE_OPBEANS_JAVA);
      await reactFlowServiceMapPage.waitForPopoverToBeVisible();

      await reactFlowServiceMapPage.serviceMapFocusMapButton.click();

      await expect(page).toHaveURL(
        new RegExp(`/app/apm/services/${SERVICE_OPBEANS_JAVA}/service-map`)
      );

      await reactFlowServiceMapPage.waitForReactFlowServiceMapToLoad();
      await expect(reactFlowServiceMapPage.reactFlowServiceMap).toBeVisible();
    });

    test('navigates to Dependency Details from popover', async ({
      page,
      pageObjects: { reactFlowServiceMapPage },
    }) => {
      await reactFlowServiceMapPage.waitForNodeToLoad(`>${DEPENDENCY_POSTGRESQL}`);
      await reactFlowServiceMapPage.clickNode(`>${DEPENDENCY_POSTGRESQL}`);
      await reactFlowServiceMapPage.waitForPopoverToBeVisible();

      await reactFlowServiceMapPage.serviceMapDependencyDetailsButton.click();

      await expect(page).toHaveURL(new RegExp(`/app/apm/dependencies/overview`));

      await page.goBack();
      await reactFlowServiceMapPage.waitForReactFlowServiceMapToLoad();
      await expect(reactFlowServiceMapPage.reactFlowServiceMap).toBeVisible();
    });
  }
);
