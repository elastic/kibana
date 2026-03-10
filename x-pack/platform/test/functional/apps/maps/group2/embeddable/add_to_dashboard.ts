/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { dashboard, header, maps, timeToVisualize } = getPageObjects([
    'dashboard',
    'header',
    'maps',
    'timeToVisualize',
  ]);

  const dashboardPanelActions = getService('dashboardPanelActions');
  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');
  const security = getService('security');

  describe('maps add-to-dashboard save flow', () => {
    before(async () => {
      await security.testUser.setRoles(
        [
          'test_logstash_reader',
          'global_maps_all',
          'geoshape_data_reader',
          'global_dashboard_all',
          'meta_for_geoshape_data_reader',
        ],
        { skipBrowserRefresh: true }
      );
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('should allow new map be added by value to a new dashboard', async () => {
      await maps.openNewMap();
      await header.waitUntilLoadingHasFinished();
      await maps.waitForLayersToLoad();

      await testSubjects.click('mapSaveButton');
      await timeToVisualize.saveFromModal('map 1', {
        addToDashboard: 'new',
        saveToLibrary: false,
      });

      await dashboard.waitForRenderComplete();

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await dashboardPanelActions.expectNotLinkedToLibrary('map 1');
      await timeToVisualize.resetNewDashboard();
    });

    it('should allow existing maps be added by value to a new dashboard', async () => {
      await maps.loadSavedMap('document example');

      await testSubjects.click('mapSaveButton');
      await timeToVisualize.saveFromModal('document example copy', {
        saveToLibrary: false,
        addToDashboard: 'new',
        saveAsNew: true,
      });

      await dashboard.waitForRenderComplete();

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await dashboardPanelActions.expectNotLinkedToLibrary('document example copy');
      await timeToVisualize.resetNewDashboard();
    });

    it('should allow new map be added by value to an existing dashboard', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();

      await dashboard.saveDashboard('My Very Cool Dashboard');
      await dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Very Cool Dashboard', 1);

      await maps.openNewMap();
      await header.waitUntilLoadingHasFinished();
      await maps.waitForLayersToLoad();

      await testSubjects.click('mapSaveButton');
      await timeToVisualize.saveFromModal('My New Map 2', {
        saveToLibrary: false,
        addToDashboard: 'existing',
        dashboardId: 'My Very Cool Dashboard',
      });

      await dashboard.waitForRenderComplete();

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await dashboardPanelActions.expectNotLinkedToLibrary('My New Map 2');
    });

    it('should allow existing maps be added by value to an existing dashboard', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();

      await dashboard.saveDashboard('My Wonderful Dashboard');
      await dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Wonderful Dashboard', 1);

      await maps.loadSavedMap('document example');

      await testSubjects.click('mapSaveButton');
      await timeToVisualize.saveFromModal('document example copy 2', {
        saveToLibrary: false,
        addToDashboard: 'existing',
        dashboardId: 'My Wonderful Dashboard',
        saveAsNew: true,
      });

      await dashboard.waitForRenderComplete();

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await dashboardPanelActions.expectNotLinkedToLibrary('document example copy 2');
    });

    it('should allow new map be added by reference to a new dashboard', async () => {
      await maps.openNewMap();
      await header.waitUntilLoadingHasFinished();
      await maps.waitForLayersToLoad();

      await testSubjects.click('mapSaveButton');
      await timeToVisualize.saveFromModal('map 1', {
        addToDashboard: 'new',
        saveToLibrary: true,
      });

      await dashboard.waitForRenderComplete();

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await dashboardPanelActions.expectLinkedToLibrary('map 1');

      await timeToVisualize.resetNewDashboard();
    });

    it('should allow existing maps be added by reference to a new dashboard', async () => {
      await maps.loadSavedMap('document example');

      await testSubjects.click('mapSaveButton');
      await timeToVisualize.saveFromModal('document example copy', {
        saveToLibrary: true,
        addToDashboard: 'new',
        saveAsNew: true,
      });

      await dashboard.waitForRenderComplete();

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await dashboardPanelActions.expectLinkedToLibrary('document example copy');
      await timeToVisualize.resetNewDashboard();
    });

    it('should allow new map be added by reference to an existing dashboard', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();

      await dashboard.saveDashboard('My Super Cool Dashboard');
      await dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Super Cool Dashboard', 1);

      await maps.openNewMap();
      await header.waitUntilLoadingHasFinished();
      await maps.waitForLayersToLoad();

      await testSubjects.click('mapSaveButton');
      await timeToVisualize.saveFromModal('My New Map 2', {
        saveToLibrary: true,
        addToDashboard: 'existing',
        dashboardId: 'My Super Cool Dashboard',
      });

      await dashboard.waitForRenderComplete();

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await dashboardPanelActions.expectLinkedToLibrary('My New Map 2');
    });

    it('should allow existing maps be added by reference to an existing dashboard', async () => {
      await dashboard.navigateToApp();
      await dashboard.clickNewDashboard();

      await dashboard.saveDashboard('My Amazing Dashboard');
      await dashboard.gotoDashboardLandingPage();
      await listingTable.searchAndExpectItemsCount('dashboard', 'My Amazing Dashboard', 1);

      await maps.loadSavedMap('document example');

      await testSubjects.click('mapSaveButton');
      await timeToVisualize.saveFromModal('document example copy 2', {
        saveToLibrary: true,
        addToDashboard: 'existing',
        dashboardId: 'My Amazing Dashboard',
        saveAsNew: true,
      });

      await dashboard.waitForRenderComplete();

      const panelCount = await dashboard.getPanelCount();
      expect(panelCount).to.eql(1);

      await dashboardPanelActions.expectLinkedToLibrary('document example copy 2');
    });
  });
}
