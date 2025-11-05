/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const es = getService('es');
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const { common, header, dashboard, visChart } = getPageObjects([
    'common',
    'header',
    'dashboard',
    'visChart',
  ]);
  const dashboardPanelActions = getService('dashboardPanelActions');
  const queryBar = getService('queryBar');
  const elasticChart = getService('elasticChart');
  const dashboardExpect = getService('dashboardExpect');

  const xyChartSelector = 'xyVisChart';

  const enableNewChartLibraryDebug = async () => {
    await elasticChart.setNewChartUiDebugFlag();
    await queryBar.submitQuery();
  };

  describe('dashboard with async search', () => {
    before(async function () {
      const body = await es.info();
      if (!body.version.number.includes('SNAPSHOT')) {
        log.debug('Skipping because this build does not have the required shard_delay agg');
        this.skip();
      }
    });

    it('not delayed should load', async () => {
      await common.navigateToApp('dashboard');
      await dashboard.loadSavedDashboard('Not Delayed');
      await header.waitUntilLoadingHasFinished();
      await dashboardExpect.noErrorEmbeddablesPresent();
      await enableNewChartLibraryDebug();
      const data = await visChart.getBarChartData(xyChartSelector, 'Sum of bytes');
      expect(data.length).to.be(5);
    });

    it('delayed should load', async () => {
      await common.navigateToApp('dashboard');
      await dashboard.loadSavedDashboard('Delayed 5s');
      await header.waitUntilLoadingHasFinished();
      await dashboardExpect.noErrorEmbeddablesPresent();
      await enableNewChartLibraryDebug();
      const data = await visChart.getBarChartData(xyChartSelector, 'Sum of bytes');
      expect(data.length).to.be(5);
    });

    it('timed out should show error', async () => {
      await common.navigateToApp('dashboard');
      await dashboard.loadSavedDashboard('Delayed 15s');
      await header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('searchTimeoutError');
    });

    it('multiple searches are grouped and only single error popup is shown', async () => {
      await common.navigateToApp('dashboard');
      await dashboard.loadSavedDashboard('Multiple delayed');
      await header.waitUntilLoadingHasFinished();

      // but only single error toast because searches are grouped
      expect((await testSubjects.findAll('searchTimeoutError')).length).to.be(1);

      const panel1SessionId1 = await dashboardPanelActions.getSearchSessionIdByTitle(
        'Sum of Bytes by Extension'
      );
      const panel2SessionId1 = await dashboardPanelActions.getSearchSessionIdByTitle(
        'Sum of Bytes by Extension (Delayed 5s)'
      );
      expect(panel1SessionId1).to.be(panel2SessionId1);

      await queryBar.clickQuerySubmitButton();

      const panel1SessionId2 = await dashboardPanelActions.getSearchSessionIdByTitle(
        'Sum of Bytes by Extension'
      );
      const panel2SessionId2 = await dashboardPanelActions.getSearchSessionIdByTitle(
        'Sum of Bytes by Extension (Delayed 5s)'
      );
      expect(panel1SessionId2).to.be(panel2SessionId2);
      expect(panel1SessionId1).not.to.be(panel1SessionId2);
    });
  });
}
