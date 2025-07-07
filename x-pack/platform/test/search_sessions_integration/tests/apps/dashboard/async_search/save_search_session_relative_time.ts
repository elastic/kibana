/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const log = getService('log');
  const retry = getService('retry');
  const { common, header, dashboard, home, maps, searchSessionsManagement } = getPageObjects([
    'common',
    'header',
    'dashboard',
    'home',
    'maps',
    'searchSessionsManagement',
  ]);
  const dashboardPanelActions = getService('dashboardPanelActions');
  const inspector = getService('inspector');
  const elasticChart = getService('elasticChart');
  const find = getService('find');
  const dashboardExpect = getService('dashboardExpect');
  const searchSessions = getService('searchSessions');

  describe('save a search sessions with relative time', () => {
    before(async () => {
      await common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await header.waitUntilLoadingHasFinished();
      // use sample data set because it has recent relative time range and bunch of different visualizations
      await home.addSampleDataSet('flights');
      await retry.tryForTime(10000, async () => {
        const isInstalled = await home.isSampleDataSetInstalled('flights');
        expect(isInstalled).to.be(true);
      });
      await common.navigateToApp('dashboard');
    });

    after(async () => {
      await common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await header.waitUntilLoadingHasFinished();
      await home.removeSampleDataSet('flights');
      const isInstalled = await home.isSampleDataSetInstalled('flights');
      expect(isInstalled).to.be(false);
    });

    it('Saves and restores a session with relative time ranges', async () => {
      await dashboard.loadSavedDashboard('[Flights] Global Flight Dashboard');
      await dashboard.waitForRenderComplete();
      await header.waitUntilLoadingHasFinished();

      await searchSessions.expectState('completed');
      await searchSessions.save();
      await searchSessions.expectState('backgroundCompleted');

      await checkSampleDashboardLoaded('xyVisChart');

      // load URL to restore a saved session
      await searchSessionsManagement.goTo();
      const searchSessionList = await searchSessionsManagement.getList();

      // navigate to dashboard
      await searchSessionList[0].view();

      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      await checkSampleDashboardLoaded('xyVisChart');

      // Check that session is restored
      await searchSessions.expectState('restored');
    });
  });

  // HELPERS

  async function checkSampleDashboardLoaded(visualizationContainer?: string) {
    log.debug('Checking no error labels');
    await dashboardExpect.noErrorEmbeddablesPresent();
    log.debug('Checking charts rendered');
    await elasticChart.waitForRenderComplete(visualizationContainer ?? 'lnsVisualizationContainer');
    log.debug('Checking saved searches rendered');
    await dashboardExpect.savedSearchRowCount(11);
    log.debug('Checking input controls rendered');
    await dashboardExpect.controlCount(3);
    log.debug('Checking tag cloud rendered');
    await dashboardExpect.tagCloudWithValuesFound(['Sunny', 'Rain', 'Clear', 'Cloudy', 'Hail']);
    log.debug('Checking vega chart rendered');
    expect(await find.existsByCssSelector('.vgaVis__view')).to.be(true);
    log.debug('Checking map rendered');
    await dashboardPanelActions.openInspectorByTitle('[Flights] Origin Time Delayed');
    await inspector.openInspectorView('Requests');
    const requestStats = await inspector.getTableData();
    const totalHits = maps.getInspectorStatRowHit(requestStats, 'Hits');
    expect(totalHits).to.equal('0');
    await inspector.close();
  }
}
