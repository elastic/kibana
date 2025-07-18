/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* This test is importing saved objects from 7.13.0 to 8.0 and the backported version
 * will import from 6.8.x to 7.x.x
 */

import expect from '@kbn/expect';
import path from 'path';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardDrilldownPanelActions = getService('dashboardDrilldownPanelActions');

  const { settings, savedObjects, dashboard } = getPageObjects([
    'settings',
    'savedObjects',
    'dashboard',
  ]);

  describe('Visualize - Export import saved objects between versions', () => {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'x-pack/test/functional/es_archives/getting_started/shakespeare'
      );
      await kibanaServer.uiSettings.replace({});
      await settings.navigateTo();
      await settings.clickKibanaSavedObjects();
      await savedObjects.importFile(
        path.join(__dirname, 'exports', 'visualize_dashboard_migration_test_7_12_1.ndjson')
      );
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/getting_started/shakespeare');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('should be able to import dashboard with various Visualize panels from 7.12.1', async () => {
      // this will catch cases where there is an error in the migrations.
      await savedObjects.checkImportSucceeded();
      await savedObjects.clickImportDone();
    });

    it('should render all panels on the dashboard', async () => {
      await dashboard.navigateToApp();
      await dashboard.loadSavedDashboard('[7.12.1] Visualize Test Dashboard');

      // dashboard should load properly
      await dashboard.expectOnDashboard('[7.12.1] Visualize Test Dashboard');
      await dashboard.waitForRenderComplete();

      // There should be 0 error embeddables on the dashboard
      const errorEmbeddables = await testSubjects.findAll('embeddableStackError');
      expect(errorEmbeddables.length).to.be(0);
    });

    it('should show the edit action for all panels', async () => {
      await dashboard.switchToEditMode();

      //   All panels should be editable. This will catch cases where an error does not create an error embeddable.
      const panelTitles = await dashboard.getPanelTitles();
      for (const title of panelTitles) {
        await dashboardPanelActions.expectExistsEditPanelAction(title);
      }
    });

    it('should retain all panel drilldowns from 7.12.1', async () => {
      // Both panels configured with drilldowns in 7.12.1 should still have drilldowns.
      const totalPanels = await dashboard.getPanelCount();
      let panelsWithDrilldowns = 0;
      for (let panelIndex = 0; panelIndex < totalPanels; panelIndex++) {
        if ((await dashboardDrilldownPanelActions.getPanelDrilldownCount(panelIndex)) === 1) {
          panelsWithDrilldowns++;
        }
      }
      expect(panelsWithDrilldowns).to.be(2);
    });
  });
}
