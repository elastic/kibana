/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags, EuiComboBoxWrapper } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/ui';
import { test, testData } from '../../fixtures';
import { EXTENDED_TIMEOUT } from '../../fixtures/constants';

const APM_DASHBOARD_DATA_VIEW_TITLE = 'traces-apm*,logs-apm*,metrics-apm*';

const { SERVICE_MAP_TEST_SERVICE, SERVICE_MAP_TEST_ENVIRONMENT_STAGING } = testData;

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

    test.beforeEach(async ({ browserAuth, uiSettings }) => {
      await browserAuth.loginAsPrivilegedUser();
      await uiSettings.set({ defaultIndex: dataViewId });
    });

    test.afterAll(async ({ apiServices, uiSettings }) => {
      await uiSettings.unset('defaultIndex');
      if (dataViewId) {
        await apiServices.dataViews.delete(dataViewId);
      }
    });

    test('adds Service map panel with service name, environment and KQL filter', async ({
      page,
      pageObjects,
    }) => {
      await test.step('open a new dashboard', async () => {
        await pageObjects.dashboard.openNewDashboard();
      });

      await test.step('set time range to last 1 hour to ensure test data is visible', async () => {
        await pageObjects.datePicker.setCommonlyUsedTime('Last_1_hour');
      });

      await test.step('open add panel flyout', async () => {
        await pageObjects.dashboard.openAddPanelFlyout();
      });

      await test.step('add Service map panel with filters', async () => {
        await expect(page.getByRole('heading', { name: 'Add panel' })).toBeVisible();
        const serviceMapMenuItem = page.getByRole('menuitem', {
          name: 'Service map',
          exact: true,
        });
        await expect(serviceMapMenuItem).toBeVisible();
        await serviceMapMenuItem.click();

        await expect(
          page.getByRole('heading', { name: 'Create service map panel', level: 2 })
        ).toBeVisible();
        // wait for combobox `isLoading` to finish
        // before interaction (see `euiLoadingSpinner` + `state: 'hidden'`).
        const serviceNameCombo = page.testSubj.locator('apmServiceMapEditorServiceNameComboBox');
        const environmentCombo = page.testSubj.locator('apmServiceMapEditorEnvironmentComboBox');
        await Promise.all([
          serviceNameCombo
            .locator('.euiLoadingSpinner')
            .waitFor({ state: 'hidden', timeout: EXTENDED_TIMEOUT }),
          environmentCombo
            .locator('.euiLoadingSpinner')
            .waitFor({ state: 'hidden', timeout: EXTENDED_TIMEOUT }),
        ]);

        // Select service name from dropdown
        const serviceNameComboBox = new EuiComboBoxWrapper(
          page,
          'apmServiceMapEditorServiceNameComboBox'
        );
        await serviceNameComboBox.selectSingleOption(SERVICE_MAP_TEST_SERVICE);

        // Select environment from dropdown (has a default value so manually type and select)
        const environmentInput = page.testSubj
          .locator('apmServiceMapEditorEnvironmentComboBox')
          .locator('[data-test-subj="comboBoxInput"]');
        await environmentInput.click();
        await page.keyboard.type(SERVICE_MAP_TEST_ENVIRONMENT_STAGING, { delay: 50 });
        const environmentOption = page.getByRole('option', {
          name: SERVICE_MAP_TEST_ENVIRONMENT_STAGING,
        });
        await environmentOption.waitFor({ state: 'visible', timeout: 10000 });
        await environmentOption.click();

        // Add KQL filter matching the staging transaction
        const kueryInput = page.testSubj.locator('apmServiceMapEditorKueryInput');
        await kueryInput.fill('transaction.name: "GET /api/staging"');

        await page.testSubj.locator('apmServiceMapEditorSaveButton').click();
      });

      await test.step('verify embeddable panel renders service map with connected nodes', async () => {
        await pageObjects.dashboard.waitForPanelsToLoad(1);
        expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
        await expect(page.testSubj.locator('apmServiceMapEmbeddable')).toBeVisible();
        await expect(
          page.testSubj.locator(
            `serviceMapNodeContextHighlightFrame > serviceMapNode-service-${SERVICE_MAP_TEST_SERVICE}`
          )
        ).toBeVisible({ timeout: 10000 });
      });

      await test.step('verify embeddable fills the panel horizontally', async () => {
        const panel = page.testSubj.locator('embeddablePanel');
        const embeddable = page.testSubj.locator('apmServiceMapEmbeddable');

        const panelBox = await panel.boundingBox();
        const embeddableBox = await embeddable.boundingBox();

        expect(panelBox).not.toBeNull();
        expect(embeddableBox).not.toBeNull();

        const horizontalFill = embeddableBox!.width / panelBox!.width;
        expect(horizontalFill).toBeGreaterThan(0.95);
      });

      await test.step('click on a service node and verify popover appears', async () => {
        const serviceNode = page.testSubj.locator(
          `serviceMapNode-service-${SERVICE_MAP_TEST_SERVICE}`
        );
        await expect(serviceNode).toBeVisible({ timeout: 10000 });
        await serviceNode.click();

        const popover = page.testSubj.locator('serviceMapPopover');
        await expect(popover).toBeVisible({ timeout: 5000 });

        const popoverTitle = page.testSubj.locator('serviceMapPopoverTitle');
        await expect(popoverTitle).toHaveText(SERVICE_MAP_TEST_SERVICE);
      });

      await test.step('maximize the Service map panel', async () => {
        await pageObjects.dashboard.maximizePanel();
        await expect(page.testSubj.locator('apmServiceMapEmbeddable')).toBeVisible();
      });

      await test.step('verify embeddable fills the maximized panel', async () => {
        const maximizedPanel = page.locator('.dshLayout-isMaximizedPanel');
        const embeddable = page.testSubj.locator('apmServiceMapEmbeddable');

        const panelBox = await maximizedPanel.boundingBox();
        const embeddableBox = await embeddable.boundingBox();

        expect(panelBox).not.toBeNull();
        expect(embeddableBox).not.toBeNull();

        const horizontalFill = embeddableBox!.width / panelBox!.width;
        const verticalFill = embeddableBox!.height / panelBox!.height;

        expect(horizontalFill).toBeGreaterThan(0.95);
        expect(verticalFill).toBeGreaterThan(0.9);
      });

      await test.step('disable custom time range and verify badge disappears', async () => {
        await pageObjects.dashboard.openCustomizePanel();
        await pageObjects.dashboard.disableCustomTimeRange();
        await pageObjects.dashboard.saveCustomizePanel();
        await pageObjects.dashboard.expectTimeRangeBadgeMissing();
      });

      await test.step('click View full service map button and verify navigation', async () => {
        const viewFullMapButton = page.testSubj.locator('serviceMapViewFullMapButton');
        await expect(viewFullMapButton).toBeVisible();
        await viewFullMapButton.click();

        await expect(page).toHaveURL(
          new RegExp(`/app/apm/services/${SERVICE_MAP_TEST_SERVICE}/service-map`)
        );
      });
    });
  }
);
