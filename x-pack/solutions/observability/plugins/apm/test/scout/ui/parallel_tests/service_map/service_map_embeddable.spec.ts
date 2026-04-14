/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';

const APM_DASHBOARD_DATA_VIEW_TITLE = 'traces-apm*,logs-apm*,metrics-apm*';

test.describe(
  'Service map embeddable',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    let dataViewId: string;

    test.beforeAll(async ({ apiServices }) => {
      const { data } = await apiServices.dataViews.create({
        title: APM_DASHBOARD_DATA_VIEW_TITLE,
        name: 'APM dashboard test data view',
        override: true,
      });
      dataViewId = data.id;
    });

    test.afterAll(async ({ apiServices, uiSettings }) => {
      await uiSettings.unset('defaultIndex');
      if (dataViewId) {
        await apiServices.dataViews.delete(dataViewId);
      }
    });

    test.beforeEach(async ({ browserAuth, uiSettings }) => {
      await browserAuth.loginAsAdmin();
      await uiSettings.set({ defaultIndex: dataViewId });
      await uiSettings.setDefaultTime({ from: testData.START_DATE, to: testData.END_DATE });
    });

    test('adds and renders Service map embeddable on a new dashboard', async ({
      page,
      pageObjects,
    }) => {
      await test.step('open a new dashboard and add panel flyout', async () => {
        await pageObjects.dashboard.openNewDashboard();
        await pageObjects.dashboard.openAddPanelFlyout();
      });

      await test.step('add Service map panel', async () => {
        await expect(page.getByRole('heading', { name: 'Add panel' })).toBeVisible();
        const serviceMapMenuItem = page.getByRole('menuitem', {
          name: 'Service map',
          exact: true,
        });
        await expect(serviceMapMenuItem).toBeVisible();
        await serviceMapMenuItem.click();
      });

      await test.step('verify embeddable panel is rendered', async () => {
        await pageObjects.dashboard.waitForPanelsToLoad(1);
        expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
        await expect(page.testSubj.locator('apmServiceMapEmbeddable')).toBeVisible();
      });

      await test.step('maximize the Service map panel', async () => {
        await pageObjects.dashboard.maximizePanel();
        await expect(page.testSubj.locator('apmServiceMapEmbeddable')).toBeVisible();
      });

      await test.step('TODO: open a service node popover by clicking a map item', async () => {
        test.info().annotations.push({
          type: 'todo',
          description: 'Skipping popover interaction in this scenario for now',
        });
      });

      await test.step('TODO: follow navigation link from the popover', async () => {
        test.info().annotations.push({
          type: 'todo',
          description: 'Skipping popover navigation assertion in this scenario for now',
        });
      });
    });
  }
);
