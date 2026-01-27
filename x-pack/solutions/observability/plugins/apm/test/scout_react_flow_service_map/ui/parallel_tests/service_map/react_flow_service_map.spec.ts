/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expect } from '@kbn/scout-oblt';
import { test, testData } from '../../fixtures';

/**
 * React Flow Service Map tests
 *
 * These tests run with the serviceMapUseReactFlow feature flag enabled.
 * The custom server config is defined in:
 * src/platform/packages/shared/kbn-scout/src/servers/configs/custom/react_flow_service_map/
 */
test.describe('React Flow Service map controls', { tag: ['@ess', '@svlOblt'] }, () => {
  test.beforeEach(async ({ browserAuth, pageObjects: { reactFlowServiceMapPage } }) => {
    await browserAuth.loginAsViewer();
    await reactFlowServiceMapPage.gotoWithDateSelected(testData.START_DATE, testData.END_DATE);
    await reactFlowServiceMapPage.waitForReactFlowServiceMapToLoad();
  });

  test('renders React Flow service map with controls', async ({
    pageObjects: { reactFlowServiceMapPage },
  }) => {
    // Verify the React Flow container is visible
    await expect(reactFlowServiceMapPage.reactFlowServiceMap).toBeVisible();

    // Verify the controls panel is visible
    await expect(reactFlowServiceMapPage.reactFlowControls).toBeVisible();

    // Verify individual control buttons are visible
    await expect(reactFlowServiceMapPage.reactFlowZoomInBtn).toBeVisible();
    await expect(reactFlowServiceMapPage.reactFlowZoomOutBtn).toBeVisible();
    await expect(reactFlowServiceMapPage.reactFlowFitViewBtn).toBeVisible();
  });

  test('zoom controls are clickable', async ({ pageObjects: { reactFlowServiceMapPage } }) => {
    // Verify controls are visible before interacting
    await expect(reactFlowServiceMapPage.reactFlowControls).toBeVisible();

    // Test zoom in
    await reactFlowServiceMapPage.clickReactFlowZoomIn();

    // Test zoom out
    await reactFlowServiceMapPage.clickReactFlowZoomOut();

    // Test fit view (center)
    await reactFlowServiceMapPage.clickReactFlowFitView();

    // Verify controls still visible after interactions
    await expect(reactFlowServiceMapPage.reactFlowControls).toBeVisible();
  });
});
