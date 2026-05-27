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
        await pageObjects.dashboard.openNewDashboard({ timeout: EXTENDED_TIMEOUT });
      });

      await test.step('set time range to last 24 hours so synth data stays in range vs globalSetup', async () => {
        await pageObjects.datePicker.setCommonlyUsedTime('Last_24_hours');
        await expect(page.getByTestId('dateRangePickerControlButton')).toContainText(
          'Last 24 hours'
        );
        await page.getByTestId('dateRangePickerControlButton').blur();
      });

      await test.step('open add panel flyout', async () => {
        await pageObjects.dashboard.openAddPanelFlyout();
      });

      await test.step('add Service map panel without filters', async () => {
        // Add the panel first with no filters. The Service Map embeddable
        // factory always initializes panels with a custom
        // `time_range: { from: 'now-15m', to: 'now' }` and that range cannot
        // be configured from the editor flyout, so we need the panel to
        // exist before we can widen its time range via the Customize panel
        // flow below.
        await expect(page.getByRole('heading', { name: 'Add to Dashboard' })).toBeVisible();
        const serviceMapMenuItem = page.getByRole('menuitem', {
          name: 'Service map',
          exact: true,
        });
        await expect(serviceMapMenuItem).toBeVisible();
        await serviceMapMenuItem.click();

        await expect(
          page.getByRole('heading', { name: 'Create service map panel', level: 2 })
        ).toBeVisible();
        await page.testSubj.locator('apmServiceMapEditorSaveButton').click();
      });

      await test.step('verify panel was added with the default custom time range', async () => {
        await pageObjects.dashboard.waitForPanelsToLoad(1);
        expect(await pageObjects.dashboard.getPanelCount()).toBe(1);
        await expect(page.testSubj.locator('apmServiceMapEmbeddable')).toBeVisible();
        await pageObjects.dashboard.expectTimeRangeBadgeExists();
      });

      await test.step('widen the panel custom time range to last 24 hours', async () => {
        // Bump the panel's custom time range from the default 15 minutes to
        // 24 hours so it (and the suggestions endpoint when we re-open the
        // editor below) covers the synth window even with significant delay
        // between global setup and this test running.
        await pageObjects.dashboard.openCustomizePanel();
        await pageObjects.dashboard.enableCustomTimeRange();
        await page.testSubj
          .locator('customizePanelTimeRangeDatePicker > superDatePickerToggleQuickMenuButton')
          .click();
        await pageObjects.dashboard.clickCommonlyUsedTimeRange('Last_24 hours');
        await pageObjects.dashboard.saveCustomizePanel();
        await pageObjects.dashboard.expectTimeRangeBadgeExists();
      });

      await test.step('edit Service map panel and apply filters', async () => {
        // Re-open the editor in edit mode. The factory passes the panel's
        // current `time_range` (now 24 hours) into the suggestions endpoint
        // so the service / environment combo boxes can resolve
        // `service-map-test` reliably.
        await pageObjects.dashboard.clickPanelAction('embeddablePanelAction-editPanel');
        await expect(
          page.getByRole('heading', { name: 'Edit service map', level: 2 })
        ).toBeVisible();

        // wait for combobox `isLoading` to finish
        // before interaction (see `euiLoadingSpinner` + `state: 'hidden'`).
        const serviceNameCombo = page.testSubj.locator('apmServiceMapEditorServiceNameComboBox');
        const environmentCombo = page.testSubj.locator('apmServiceMapEditorEnvironmentComboBox');
        await serviceNameCombo
          .locator('.euiLoadingSpinner')
          .waitFor({ state: 'hidden', timeout: EXTENDED_TIMEOUT });
        await environmentCombo
          .locator('.euiLoadingSpinner')
          .waitFor({ state: 'hidden', timeout: EXTENDED_TIMEOUT });

        // Select service name from dropdown
        const serviceNameComboBox = new EuiComboBoxWrapper(
          page,
          'apmServiceMapEditorServiceNameComboBox'
        );
        await serviceNameComboBox.selectSingleOption(SERVICE_MAP_TEST_SERVICE, {
          useFill: true,
          optionVisibilityTimeoutMs: EXTENDED_TIMEOUT,
        });

        // Select environment from dropdown (has a default value so manually type and select)
        const environmentInput = page.testSubj
          .locator('apmServiceMapEditorEnvironmentComboBox')
          .locator('[data-test-subj="comboBoxInput"]');
        await environmentInput.click();
        await page.keyboard.type(SERVICE_MAP_TEST_ENVIRONMENT_STAGING, { delay: 50 });
        const environmentOption = page.getByRole('option', {
          name: SERVICE_MAP_TEST_ENVIRONMENT_STAGING,
        });
        await environmentOption.waitFor({ state: 'visible', timeout: EXTENDED_TIMEOUT });
        await environmentOption.click();

        // Add KQL filter matching the staging transaction
        const kueryInput = page.testSubj.locator('apmServiceMapEditorKueryInput');
        await kueryInput.fill('transaction.name: "GET /api/staging"');

        await page.testSubj.locator('apmServiceMapEditorSaveButton').click();
      });

      await test.step('verify embeddable panel renders service map with connected nodes', async () => {
        await expect(
          page.testSubj.locator(
            `serviceMapNodeContextHighlightFrame > serviceMapNode-service-${SERVICE_MAP_TEST_SERVICE}`
          )
        ).toBeVisible({ timeout: EXTENDED_TIMEOUT });
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
        await expect(serviceNode).toBeVisible({ timeout: EXTENDED_TIMEOUT });
        await serviceNode.click();

        const popover = page.testSubj.locator('serviceMapPopover');
        await expect(popover).toBeVisible({ timeout: 5000 });

        const popoverTitle = page.testSubj.locator('serviceMapPopoverTitle');
        await expect(popoverTitle).toHaveText(SERVICE_MAP_TEST_SERVICE);

        await page.keyboard.press('Escape');
        await expect(popoverTitle).toBeHidden();
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
