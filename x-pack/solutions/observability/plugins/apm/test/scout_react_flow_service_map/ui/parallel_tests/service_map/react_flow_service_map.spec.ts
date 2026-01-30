/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';
import { SERVICE_OPBEANS_JAVA, SERVICE_OPBEANS_NODE } from '../../fixtures/constants';

/**
 * React Flow Service Map tests
 *
 * These tests run with the serviceMapUseReactFlow feature flag enabled.
 * The custom server config is defined in:
 * src/platform/packages/shared/kbn-scout/src/servers/configs/custom/react_flow_service_map/
 */
test.describe('React Flow Service Map', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { reactFlowServiceMapPage } }) => {
    await browserAuth.loginAsViewer();
    await reactFlowServiceMapPage.gotoWithDateSelected(testData.START_DATE, testData.END_DATE);
    await reactFlowServiceMapPage.waitForReactFlowServiceMapToLoad();
  });

  test('renders service map with controls', async ({
    pageObjects: { reactFlowServiceMapPage },
  }) => {
    // Verify the React Flow container is visible (data-test-subj)
    await expect(reactFlowServiceMapPage.reactFlowServiceMap).toBeVisible();

    // Verify the controls panel is visible (data-test-subj)
    await expect(reactFlowServiceMapPage.reactFlowControls).toBeVisible();

    // Verify individual control buttons are visible (accessible roles)
    await expect(reactFlowServiceMapPage.reactFlowZoomInBtn).toBeVisible();
    await expect(reactFlowServiceMapPage.reactFlowZoomOutBtn).toBeVisible();
    await expect(reactFlowServiceMapPage.reactFlowFitViewBtn).toBeVisible();

    await test.step('zoom controls are interactive', async () => {
      await expect(reactFlowServiceMapPage.reactFlowControls).toBeVisible();

      await reactFlowServiceMapPage.clickReactFlowZoomIn();
      await reactFlowServiceMapPage.clickReactFlowZoomOut();
      await reactFlowServiceMapPage.clickReactFlowFitView();

      // Verify controls still visible after interactions
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
});
