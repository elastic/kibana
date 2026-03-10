/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { OPTIONS_LIST_CONTROL, RANGE_SLIDER_CONTROL } from '@kbn/controls-plugin/common';

import { FtrProviderContext } from '../../../../ftr_provider_context';

const DRILLDOWN_TO_PIE_CHART_NAME = 'Go to pie chart dashboard';
const DRILLDOWN_TO_AREA_CHART_NAME = 'Go to area chart dashboard';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const dashboardDrilldownPanelActions = getService('dashboardDrilldownPanelActions');
  const dashboardDrilldownsManage = getService('dashboardDrilldownsManage');
  const {
    dashboard,
    dashboardControls,
    common,
    header,
    timePicker,
    settings,
    copySavedObjectsToSpace,
  } = getPageObjects([
    'dashboard',
    'dashboardControls',
    'common',
    'header',
    'timePicker',
    'settings',
    'copySavedObjectsToSpace',
  ]);
  const queryBar = getService('queryBar');
  const pieChart = getService('pieChart');
  const log = getService('log');
  const browser = getService('browser');
  const retry = getService('retry');
  const filterBar = getService('filterBar');
  const security = getService('security');
  const spaces = getService('spaces');
  const elasticChart = getService('elasticChart');
  const toasts = getService('toasts');

  const createDrilldown = async () => {
    await dashboard.gotoDashboardEditMode(dashboardDrilldownsManage.DASHBOARD_WITH_PIE_CHART_NAME);
    await toasts.dismissAll(); // toasts get in the way of bottom "Create drilldown" button in flyout

    // create drilldown
    await dashboardDrilldownPanelActions.clickCreateDrilldown();
    await dashboardDrilldownsManage.expectsCreateDrilldownFlyoutOpen();
    await testSubjects.click('actionFactoryItem-DASHBOARD_TO_DASHBOARD_DRILLDOWN');
    await dashboardDrilldownsManage.fillInDashboardToDashboardDrilldownWizard({
      drilldownName: DRILLDOWN_TO_AREA_CHART_NAME,
      destinationDashboardTitle: dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME,
    });
    await dashboardDrilldownsManage.saveChanges();
    await dashboardDrilldownsManage.closeFlyout();

    // check that drilldown notification badge is shown
    expect(await dashboardDrilldownPanelActions.getPanelDrilldownCount()).to.be(1);

    // save dashboard, navigate to view mode
    await testSubjects.existOrFail('dashboardUnsavedChangesBadge');
    await dashboard.saveDashboard(dashboardDrilldownsManage.DASHBOARD_WITH_PIE_CHART_NAME, {
      saveAsNew: false,
      waitDialogIsClosed: true,
      exitFromEditMode: true,
    });
    await testSubjects.missingOrFail('dashboardUnsavedChangesBadge');
  };

  const createControls = async (
    dashboardName: string,
    controls: Array<{ field: string; type: string }>
  ) => {
    await dashboard.gotoDashboardEditMode(dashboardName);
    await toasts.dismissAll(); // toasts get in the way of bottom "Save and close" button in create control flyout

    for (const control of controls) {
      await dashboardControls.createControl({
        controlType: control.type,
        dataViewTitle: 'logstash-*',
        fieldName: control.field,
      });
    }
    await dashboard.clickQuickSave();
  };

  const brushAreaChart = async () => {
    const areaChart = await testSubjects.find('visualizationLoader');
    expect(await areaChart.getAttribute('data-title')).to.be('Visualization漢字 AreaChart');
    await browser.dragAndDrop(
      {
        location: areaChart,
        offset: {
          x: -100,
          y: 0,
        },
      },
      {
        location: areaChart,
        offset: {
          x: 100,
          y: 0,
        },
      }
    );
  };

  const navigateAndEnsureIDChange = async (navigationTrigger: () => Promise<void>) => {
    // before executing action which would trigger navigation: remember current dashboard id in url
    const oldDashboardId = await dashboard.getDashboardIdFromCurrentUrl();
    // execute navigation action
    await navigationTrigger();
    // wait until dashboard navigates to a new dashboard with area chart
    await retry.waitFor('navigate to different dashboard', async () => {
      const newDashboardId = await dashboard.getDashboardIdFromCurrentUrl();
      return typeof newDashboardId === 'string' && oldDashboardId !== newDashboardId;
    });
    await header.waitUntilLoadingHasFinished();
    await dashboard.waitForRenderComplete();
  };

  describe('Dashboard to dashboard drilldown', function () {
    describe('Create & use drilldowns', () => {
      before(async () => {
        log.debug('Dashboard Drilldowns:initTests');
        await security.testUser.setRoles(['test_logstash_reader', 'global_dashboard_all']);
        await dashboard.navigateToApp();
        await dashboard.preserveCrossAppState();
        await elasticChart.setNewChartUiDebugFlag();

        await createDrilldown();
      });

      after(async () => {
        await security.testUser.restoreDefaults();
      });

      const openContextMenuFromPieSlice = async () => {
        await retry.waitFor('drilldown action menu to appear', async () => {
          await pieChart.clickOnPieSlice('40000');
          return await testSubjects.exists('multipleActionsContextMenu');
        });
      };

      describe('test dashboard to dashboard drilldown', () => {
        beforeEach(async () => {
          await dashboard.gotoDashboardEditMode(
            dashboardDrilldownsManage.DASHBOARD_WITH_PIE_CHART_NAME
          );
        });

        afterEach(async () => {
          // reset all dashboards to their last saved state by clearing session storage
          await browser.clearSessionStorage();
        });

        it('drills to destination dashboard via onClick action', async () => {
          await openContextMenuFromPieSlice();

          // Navigate via drilldown, ensuring that the ID changes.
          await navigateAndEnsureIDChange(async () => {
            await dashboardDrilldownPanelActions.clickActionByText(DRILLDOWN_TO_AREA_CHART_NAME);
          });

          // ensure that we ended up on the correct destination dashboard.
          await dashboard.expectOnDashboard(
            dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME
          );

          // ensure drilldown creates filter on destination.
          expect(await filterBar.hasFilter('memory', '40,000 to 80,000')).to.be(true);
        });

        it('drills to destination dashboard via getHref action', async () => {
          await openContextMenuFromPieSlice();

          const href = await dashboardDrilldownPanelActions.getActionHrefByText(
            DRILLDOWN_TO_AREA_CHART_NAME
          );
          expect(typeof href).to.be('string'); // checking that action has a href
          const dashboardIdFromHref = dashboard.getDashboardIdFromUrl(href);

          await navigateAndEnsureIDChange(async () => {
            await dashboardDrilldownPanelActions.openHrefByText(DRILLDOWN_TO_AREA_CHART_NAME);
          });

          // checking that href points to the dashboard id that we have navigated to.
          expect(dashboardIdFromHref).to.be(await dashboard.getDashboardIdFromCurrentUrl());

          // ensure that we ended up on the correct destination dashboard.
          await dashboard.expectOnDashboard(
            dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME
          );

          // ensure drilldown creates filter on destination.
          expect(await filterBar.hasFilter('memory', '40,000 to 80,000')).to.be(true);
        });

        it('carries over all filters from source dashboard', async () => {
          // add a new unrelated filter.
          await filterBar.addFilter({ field: 'machine.os', operation: 'is', value: 'ios' });

          await openContextMenuFromPieSlice();

          // Navigate via drilldown, ensuring that the ID changes.
          await navigateAndEnsureIDChange(async () => {
            await dashboardDrilldownPanelActions.clickActionByText(DRILLDOWN_TO_AREA_CHART_NAME);
          });

          // ensure that we ended up on the correct destination dashboard.
          await dashboard.expectOnDashboard(
            dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME
          );

          // ensure that the unrelated filter has been carried over.
          expect(await filterBar.hasFilter('machine.os', 'ios')).to.be(true);
        });

        it('carries over time range from source dashboard', async () => {
          const startTime = 'Sep 22, 2015 @ 06:31:44.000';
          const endTime = 'Sep 23, 2015 @ 06:31:44.000';
          await timePicker.setAbsoluteRange(startTime, endTime);

          // Navigate via drilldown, ensuring that the ID changes.
          await openContextMenuFromPieSlice();
          await navigateAndEnsureIDChange(async () => {
            await dashboardDrilldownPanelActions.clickActionByText(DRILLDOWN_TO_AREA_CHART_NAME);
          });

          // ensure that we ended up on the correct destination dashboard.
          await dashboard.expectOnDashboard(
            dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME
          );

          // ensure that the time range has been carried over.
          expect(await timePicker.getTimeDurationInHours()).to.be(24);

          // reset time range
          await timePicker.setDefaultAbsoluteRange();
        });

        it('browser back navigation works after drilldown navigation', async () => {
          await openContextMenuFromPieSlice();

          // Navigate via drilldown, ensuring that the ID changes.
          await navigateAndEnsureIDChange(async () => {
            await dashboardDrilldownPanelActions.clickActionByText(DRILLDOWN_TO_AREA_CHART_NAME);
          });

          // ensure that we ended up on the correct destination dashboard.
          await dashboard.expectOnDashboard(
            dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME
          );

          await navigateAndEnsureIDChange(async () => {
            await browser.goBack();
          });

          // ensure that we have returned to the origin dashboard.
          await dashboard.clickCancelOutOfEditMode();
          await dashboard.waitForRenderComplete();

          await dashboard.expectOnDashboard(
            dashboardDrilldownsManage.DASHBOARD_WITH_PIE_CHART_NAME
          );
        });

        it('delete dashboard to dashboard drilldown', async () => {
          // delete drilldown
          await dashboard.switchToEditMode();
          await dashboardDrilldownPanelActions.clickManageDrilldowns();
          await dashboardDrilldownsManage.expectsManageDrilldownsFlyoutOpen();

          await dashboardDrilldownsManage.deleteDrilldownsByTitles([DRILLDOWN_TO_AREA_CHART_NAME]);
          await dashboardDrilldownsManage.closeFlyout();

          // check that drilldown notification badge is not shown
          expect(await dashboardDrilldownPanelActions.getPanelDrilldownCount()).to.be(0);

          // this drilldown will be available again in the next test because the session storage is cleared.
        });
      });

      describe('test dashboard to dashboard drilldown with controls', () => {
        const cleanFiltersAndControls = async (dashboardName: string) => {
          await dashboard.gotoDashboardEditMode(dashboardName);
          await filterBar.removeAllFilters();
          await dashboardControls.deleteAllControls();
          await dashboard.clickQuickSave();
        };

        before('add controls and make selections', async () => {
          /** Source Dashboard */
          await createControls(dashboardDrilldownsManage.DASHBOARD_WITH_PIE_CHART_NAME, [
            { field: 'geo.src', type: OPTIONS_LIST_CONTROL },
            { field: 'bytes', type: RANGE_SLIDER_CONTROL },
          ]);
          const controlIds = await dashboardControls.getAllControlIds();
          const [optionsListControl, rangeSliderControl] = controlIds;
          await dashboardControls.optionsListOpenPopover(optionsListControl);
          await dashboardControls.optionsListPopoverSelectOption('CN');
          await dashboardControls.optionsListPopoverSelectOption('US');
          await dashboardControls.rangeSliderWaitForLoading(rangeSliderControl); // wait for range slider to respond to options list selections before proceeding
          await dashboardControls.rangeSliderSetLowerBound(rangeSliderControl, '1000');
          await dashboardControls.rangeSliderSetUpperBound(rangeSliderControl, '15000');
          await dashboard.waitForRenderComplete();
          await dashboard.clickQuickSave();
          await header.waitUntilLoadingHasFinished();

          /** Destination Dashboard */
          await createControls(dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME, [
            { field: 'geo.src', type: OPTIONS_LIST_CONTROL },
          ]);
        });

        after(async () => {
          await cleanFiltersAndControls(dashboardDrilldownsManage.DASHBOARD_WITH_PIE_CHART_NAME);
          await cleanFiltersAndControls(dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME);
        });

        it('creates filter pills representing controls selections', async () => {
          await dashboard.gotoDashboardEditMode(
            dashboardDrilldownsManage.DASHBOARD_WITH_PIE_CHART_NAME
          );

          await openContextMenuFromPieSlice();

          await navigateAndEnsureIDChange(async () => {
            await dashboardDrilldownPanelActions.clickActionByText(DRILLDOWN_TO_AREA_CHART_NAME);
          });

          // check that we drilled-down with filter from pie chart
          expect(await filterBar.hasFilter('memory', '40,000 to 80,000')).to.be(true);

          // drilldown creates filter pills for control selections
          expect(await filterBar.hasFilter('geo.src', 'CN, US')).to.be(true);
          expect(await filterBar.hasFilter('bytes', '1,000 to 15,000')).to.be(true);

          // control filter pills impact destination dashboard controls
          const controlIds = await dashboardControls.getAllControlIds();
          const optionsListControl = controlIds[0];
          await dashboardControls.optionsListOpenPopover(optionsListControl);
          expect(await dashboardControls.optionsListPopoverGetAvailableOptionsCount()).to.equal(2);
          await dashboardControls.optionsListEnsurePopoverIsClosed(optionsListControl);
        });
      });
    });

    describe('Copy to space', () => {
      const destinationSpaceId = 'custom_space';

      before(async () => {
        await spaces.create({
          id: destinationSpaceId,
          name: 'custom_space',
          disabledFeatures: [],
        });
        await settings.navigateTo();
        await settings.clickKibanaSavedObjects();
      });

      after(async () => {
        await spaces.delete(destinationSpaceId);
      });

      it('Dashboards linked by a drilldown are both copied to a space', async () => {
        await copySavedObjectsToSpace.openCopyToSpaceFlyoutForObject(
          dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME
        );
        await copySavedObjectsToSpace.setupForm({
          destinationSpaceId,
        });
        await copySavedObjectsToSpace.startCopy();

        // Wait for successful copy
        await testSubjects.waitForDeleted(`cts-summary-indicator-loading-${destinationSpaceId}`);
        await testSubjects.existOrFail(`cts-summary-indicator-success-${destinationSpaceId}`);

        const summaryCounts = await copySavedObjectsToSpace.getSummaryCounts();

        expect(summaryCounts).to.eql({
          success: 5, // 2 dashboards (linked by a drilldown) + 2 visualizations + 1 index pattern
          pending: 0,
          skipped: 0,
          errors: 0,
        });

        await copySavedObjectsToSpace.finishCopy();

        // Actually use copied dashboards in a new space:

        await common.navigateToApp('dashboards', {
          basePath: `/s/${destinationSpaceId}`,
        });
        await dashboard.preserveCrossAppState();
        await dashboard.loadSavedDashboard(
          dashboardDrilldownsManage.DASHBOARD_WITH_AREA_CHART_NAME
        );
        await header.waitUntilLoadingHasFinished();
        await dashboard.waitForRenderComplete();

        // brush area chart and drilldown back to pie chat dashboard
        await brushAreaChart();
        await dashboardDrilldownPanelActions.expectMultipleActionsMenuOpened();

        await navigateAndEnsureIDChange(async () => {
          await dashboardDrilldownPanelActions.clickActionByText(DRILLDOWN_TO_PIE_CHART_NAME);
        });
        await elasticChart.setNewChartUiDebugFlag();
        await queryBar.submitQuery();
        await pieChart.expectPieSliceCountEsCharts(10);
      });
    });
  });
}
