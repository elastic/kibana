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
  DEPENDENCY_POSTGRESQL,
  EDGE_OPBEANS_JAVA_TO_POSTGRESQL,
  SERVICE_MAP_KUERY_OPBEANS,
  SERVICE_OPBEANS_JAVA,
  SERVICE_OPBEANS_NODE,
} from '../../fixtures/constants';

test.describe(
  'Service map - nodes, edges and popovers',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    test.beforeEach(async ({ browserAuth, pageObjects: { serviceMapPage } }) => {
      await browserAuth.loginAsViewer();
      await serviceMapPage.gotoWithDateSelected(testData.START_DATE, testData.END_DATE, {
        kuery: SERVICE_MAP_KUERY_OPBEANS,
      });
      await serviceMapPage.waitForMapToLoad();
      await serviceMapPage.dismissPopoverIfOpen();
    });

    test('renders service map with controls', async ({ pageObjects: { serviceMapPage } }) => {
      await expect(serviceMapPage.serviceMapGraph).toBeVisible();
      await expect(serviceMapPage.mapControls).toBeVisible();
      await expect(serviceMapPage.zoomInBtnControl).toBeVisible();
      await expect(serviceMapPage.zoomOutBtnControl).toBeVisible();
      await expect(serviceMapPage.fitViewBtn).toBeVisible();

      await test.step('zoom controls are interactive', async () => {
        await expect(serviceMapPage.mapControls).toBeVisible();
        await serviceMapPage.clickMapZoomIn();
        await serviceMapPage.clickMapZoomOut();
        await serviceMapPage.clickFitView();
        await expect(serviceMapPage.mapControls).toBeVisible();
      });

      await serviceMapPage.waitForServiceNodeToLoad(SERVICE_OPBEANS_JAVA);

      await test.step('service nodes from opbeans data', async () => {
        const opbeansJavaNode = serviceMapPage.getServiceNode(SERVICE_OPBEANS_JAVA);
        await expect(opbeansJavaNode).toBeVisible();
        const opbeansNodeNode = serviceMapPage.getServiceNode(SERVICE_OPBEANS_NODE);
        await expect(opbeansNodeNode).toBeVisible();
      });

      await test.step('edges from service to dependency', async () => {
        // Opbeans synthtrace has opbeans-java → postgresql (no direct opbeans-java → opbeans-node edge)
        const edge = serviceMapPage.getEdgeById(EDGE_OPBEANS_JAVA_TO_POSTGRESQL);
        await expect(edge).toBeVisible();
      });
    });

    test('shows popover when clicking on a service node', async ({
      pageObjects: { serviceMapPage },
    }) => {
      await serviceMapPage.clickFitView();
      await serviceMapPage.waitForServiceNodeToLoad(SERVICE_OPBEANS_JAVA);
      await serviceMapPage.clickServiceNode(SERVICE_OPBEANS_JAVA);
      await serviceMapPage.waitForPopoverToBeVisible();
      await expect(serviceMapPage.serviceMapPopover).toBeVisible();

      const popoverTitle = await serviceMapPage.getPopoverTitle();
      expect(popoverTitle).toContain(SERVICE_OPBEANS_JAVA);
      await expect(serviceMapPage.serviceMapServiceDetailsButton).toBeVisible();
      await expect(serviceMapPage.serviceMapFocusMapButton).toBeVisible();
    });

    test('dismisses popover when clicking outside', async ({ pageObjects: { serviceMapPage } }) => {
      await serviceMapPage.clickFitView();
      await serviceMapPage.waitForServiceNodeToLoad(SERVICE_OPBEANS_JAVA);
      await serviceMapPage.clickServiceNode(SERVICE_OPBEANS_JAVA);
      await serviceMapPage.waitForPopoverToBeVisible();
      await expect(serviceMapPage.serviceMapPopoverContent).toBeVisible();

      await serviceMapPage.clickFitView();
      await serviceMapPage.waitForServiceNodeToLoad(SERVICE_OPBEANS_JAVA);
      await serviceMapPage.waitForPopoverToBeHidden();
      await expect(serviceMapPage.serviceMapPopoverContent).toBeHidden();
    });

    test('shows popover when clicking on an edge', async ({ pageObjects: { serviceMapPage } }) => {
      await serviceMapPage.clickFitView();
      await serviceMapPage.waitForEdgeToLoad(EDGE_OPBEANS_JAVA_TO_POSTGRESQL);
      await serviceMapPage.clickEdge(EDGE_OPBEANS_JAVA_TO_POSTGRESQL);
      await serviceMapPage.waitForPopoverToBeVisible();
      await expect(serviceMapPage.serviceMapPopoverContent).toBeVisible();

      const popoverTitle = await serviceMapPage.getPopoverTitle();
      expect(popoverTitle).toContain(`${SERVICE_OPBEANS_JAVA} → ${DEPENDENCY_POSTGRESQL}`);
    });

    test('shows popover when clicking on a dependency node', async ({
      pageObjects: { serviceMapPage },
    }) => {
      await serviceMapPage.dismissPopoverIfOpen();
      await serviceMapPage.clickFitView();
      await serviceMapPage.waitForNodeToLoad(`>${DEPENDENCY_POSTGRESQL}`);
      await serviceMapPage.clickNode(`>${DEPENDENCY_POSTGRESQL}`);
      await serviceMapPage.waitForPopoverToBeVisible();
      await expect(serviceMapPage.serviceMapPopoverContent).toBeVisible();

      const popoverTitle = await serviceMapPage.getPopoverTitle();
      expect(popoverTitle).toContain(DEPENDENCY_POSTGRESQL);
      await expect(serviceMapPage.serviceMapDependencyDetailsButton).toBeVisible();
    });

    test('navigates to Service Details from popover', async ({
      page,
      pageObjects: { serviceMapPage },
    }) => {
      await serviceMapPage.dismissPopoverIfOpen();
      await serviceMapPage.clickFitView();
      await serviceMapPage.waitForServiceNodeToLoad(SERVICE_OPBEANS_JAVA);
      await serviceMapPage.clickServiceNode(SERVICE_OPBEANS_JAVA);
      await serviceMapPage.waitForPopoverToBeVisible();
      await serviceMapPage.serviceMapServiceDetailsButton.click();

      await expect(page).toHaveURL(
        new RegExp(`/app/apm/services/${SERVICE_OPBEANS_JAVA}/overview`)
      );
      await page.goBack();
      await serviceMapPage.waitForMapToLoad();
      await expect(serviceMapPage.serviceMapGraph).toBeVisible();
    });

    test('navigates to Focus Map from popover', async ({
      page,
      pageObjects: { serviceMapPage },
    }) => {
      await serviceMapPage.dismissPopoverIfOpen();
      await serviceMapPage.clickFitView();
      await serviceMapPage.waitForServiceNodeToLoad(SERVICE_OPBEANS_JAVA);
      await serviceMapPage.clickServiceNode(SERVICE_OPBEANS_JAVA);
      await serviceMapPage.waitForPopoverToBeVisible();
      await serviceMapPage.serviceMapFocusMapButton.click();

      await expect(page).toHaveURL(
        new RegExp(`/app/apm/services/${SERVICE_OPBEANS_JAVA}/service-map`)
      );
      await serviceMapPage.waitForMapToLoad();
      await expect(serviceMapPage.serviceMapGraph).toBeVisible();
    });

    test('navigates to Dependency Details from popover', async ({
      page,
      pageObjects: { serviceMapPage },
    }) => {
      await serviceMapPage.dismissPopoverIfOpen();
      await serviceMapPage.clickFitView();
      await serviceMapPage.waitForNodeToLoad(`>${DEPENDENCY_POSTGRESQL}`);
      await serviceMapPage.clickNode(`>${DEPENDENCY_POSTGRESQL}`);
      await serviceMapPage.waitForPopoverToBeVisible();
      await serviceMapPage.serviceMapDependencyDetailsButton.click();

      await expect(page).toHaveURL(new RegExp(`/app/apm/dependencies/overview`));
      await page.goBack();
      await serviceMapPage.waitForMapToLoad();
      await expect(serviceMapPage.serviceMapGraph).toBeVisible();
    });
  }
);
