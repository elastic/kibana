/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ON_OPEN_PANEL_MENU } from '@kbn/ui-actions-plugin/common/trigger_ids';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const dataGrid = getService('dataGrid');
  const dashboardAddPanel = getService('dashboardAddPanel');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const dashboardDrilldownPanelActions = getService('dashboardDrilldownPanelActions');
  const dashboardDrilldownsManage = getService('dashboardDrilldownsManage');
  const filterBar = getService('filterBar');
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const queryBar = getService('queryBar');
  const security = getService('security');
  const { common, dashboard, header, discover } = getPageObjects([
    'common',
    'dashboard',
    'header',
    'discover',
  ]);

  describe('discover saved search embeddable', () => {
    before(async () => {
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/dashboard/current/data'
      );
      await kibanaServer.savedObjects.cleanStandardList();
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/dashboard/current/kibana'
      );
      await kibanaServer.importExport.load(
        'x-pack/platform/test/functional/fixtures/kbn_archives/discover/discover_sessions_for_embeddable'
      );
      await kibanaServer.uiSettings.replace({
        defaultIndex: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
      });
      await common.setTime({
        from: 'Sep 22, 2015 @ 00:00:00.000',
        to: 'Sep 23, 2015 @ 00:00:00.000',
      });
    });

    after(async () => {
      await kibanaServer.savedObjects.cleanStandardList();
      await common.unsetTime();
    });

    beforeEach(async () => {
      await dashboard.navigateToApp();
      await filterBar.ensureFieldEditorModalIsClosed();
      await dashboard.gotoDashboardLandingPage();
      await dashboard.clickNewDashboard();
    });

    const addSearchEmbeddableToDashboard = async (title = 'Rendering-Test:-saved-search') => {
      await dashboardAddPanel.addSavedSearch(title);
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      const rows = await dataGrid.getDocTableRows();
      expect(rows.length).to.be.above(0);
    };

    const refreshDashboardPage = async (requireRenderComplete = false) => {
      await browser.refresh();
      await header.waitUntilLoadingHasFinished();
      if (requireRenderComplete) {
        await dashboard.waitForRenderComplete();
      }
    };

    const getDeletedTabCalloutText = async () => {
      const deletedTabCallout = await testSubjects.find('discoverEmbeddableDeletedTabCallout');
      return await deletedTabCallout.getVisibleText();
    };

    const removeFilteredTabFromSavedSearch = async (savedSearchTitle: string) => {
      await discover.navigateToApp();
      await discover.loadSavedSearch(savedSearchTitle);
      await discover.waitUntilTabIsLoaded();

      await testSubjects.moveMouseTo('unifiedTabs_tab_filtered-tab');
      await testSubjects.click('unifiedTabs_closeTabBtn_filtered-tab');
      await discover.waitUntilTabIsLoaded();

      await discover.saveSearch(savedSearchTitle, false);
      await discover.waitUntilTabIsLoaded();
    };

    it('should allow removing the dashboard panel after the underlying saved search has been deleted', async () => {
      const searchTitle = 'TempSearch';
      const searchId = '90943e30-9a47-11e8-b64d-95841ca0b247';
      await kibanaServer.savedObjects.create({
        type: 'search',
        id: searchId,
        overwrite: false,
        attributes: {
          title: searchTitle,
          description: '',
          columns: ['agent', 'bytes', 'clientip'],
          sort: [['@timestamp', 'desc']],
          kibanaSavedObjectMeta: {
            searchSourceJSON:
              '{"highlightAll":true,"version":true,"query":{"language":"lucene","query":""},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
          },
          tabs: [
            {
              id: 'my_tab',
              label: 'My Tab',
              attributes: {
                columns: ['agent', 'bytes', 'clientip'],
                sort: [['@timestamp', 'desc']],
                kibanaSavedObjectMeta: {
                  searchSourceJSON:
                    '{"highlightAll":true,"version":true,"query":{"language":"lucene","query":""},"filter":[],"indexRefName":"kibanaSavedObjectMeta.searchSourceJSON.index"}',
                },
              },
            },
          ],
        },
        references: [
          {
            id: '0bf35f60-3dc9-11e8-8660-4d65aa086b3c',
            name: 'kibanaSavedObjectMeta.searchSourceJSON.index',
            type: 'index-pattern',
          },
        ],
      });
      await addSearchEmbeddableToDashboard(searchTitle);
      await dashboard.saveDashboard('Dashboard with deleted saved search', {
        waitDialogIsClosed: true,
        exitFromEditMode: false,
        saveAsNew: true,
      });
      await kibanaServer.savedObjects.delete({
        type: 'search',
        id: searchId,
      });
      await refreshDashboardPage();
      await testSubjects.existOrFail('embeddableError');
      const panels = await dashboard.getDashboardPanels();
      await dashboardPanelActions.removePanel(panels[0]);
      await header.waitUntilLoadingHasFinished();
      await testSubjects.missingOrFail('embeddableError');
    });

    it('should support URL drilldown', async () => {
      await addSearchEmbeddableToDashboard();
      await dashboardDrilldownPanelActions.clickCreateDrilldown();
      const drilldownName = 'URL drilldown';
      const urlTemplate =
        "{{kibanaUrl}}/app/discover#/?_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:'{{context.panel.timeRange.from}}',to:'{{context.panel.timeRange.to}}'))" +
        "&_a=(columns:!(_source),filters:{{rison context.panel.filters}},index:'{{context.panel.indexPatternId}}',interval:auto," +
        "query:(language:{{context.panel.query.language}},query:'clientip:239.190.189.77'),sort:!())";
      await testSubjects.click('drilldownFactoryItem-url_drilldown');
      await dashboardDrilldownsManage.fillInDashboardToURLDrilldownWizard({
        drilldownName,
        destinationURLTemplate: urlTemplate,
        trigger: ON_OPEN_PANEL_MENU,
      });
      await testSubjects.click('urlDrilldownAdditionalOptions');
      await testSubjects.click('urlDrilldownOpenInNewTab');
      await dashboardDrilldownsManage.saveChanges();
      await dashboard.saveDashboard('Dashboard with URL drilldown', {
        saveAsNew: true,
        waitDialogIsClosed: true,
        exitFromEditMode: true,
      });
      await browser.refresh();
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      await dashboardPanelActions.openContextMenu();
      await find.clickByLinkText(drilldownName);
      await discover.waitForDiscoverAppOnScreen();
      await header.waitUntilLoadingHasFinished();
      await discover.waitForDocTableLoadingComplete();
      expect(await queryBar.getQueryString()).to.be('clientip:239.190.189.77');
      expect(await discover.getHitCount()).to.be('6');
    });

    it('should apply data, columns and sorting from selected Discover tab', async () => {
      await addSearchEmbeddableToDashboard('Discover embeddable multi tab');

      const initialDocumentCount = await discover.getSavedSearchDocumentCount();
      const initialHeaders = await dataGrid.getHeaderFields();
      const initialFirstCell = await (
        await dataGrid.getCellElementExcludingControlColumns(0, 0)
      ).getVisibleText();

      expect(initialHeaders).to.contain('@timestamp');
      expect(initialHeaders).to.contain('agent');

      await discover.selectEmbeddableTab('Filtered tab');

      const switchedDocumentCount = await discover.getSavedSearchDocumentCount();
      const switchedHeaders = await dataGrid.getHeaderFields();
      const firstBytesCell = await (
        await dataGrid.getCellElementByColumnName(0, 'bytes')
      ).getVisibleText();
      const secondBytesCell = await (
        await dataGrid.getCellElementByColumnName(1, 'bytes')
      ).getVisibleText();

      const firstBytesValue = Number(firstBytesCell.replace(/,/g, ''));
      const secondBytesValue = Number(secondBytesCell.replace(/,/g, ''));

      expect(switchedDocumentCount).not.to.be(initialDocumentCount);
      expect(switchedHeaders).to.contain('bytes');
      expect(switchedHeaders).to.contain('clientip');
      expect(switchedHeaders.includes('agent')).to.be(false);
      expect(firstBytesCell).not.to.be(initialFirstCell);
      expect(Number.isNaN(firstBytesValue)).to.be(false);
      expect(Number.isNaN(secondBytesValue)).to.be(false);
      expect(firstBytesValue <= secondBytesValue).to.be(true);
    });

    it('should show deleted-tab warning in view and edit modes for editor users and dismiss it by selecting a different tab', async () => {
      const savedSearchTitle = 'Discover embeddable deleted tab editor';
      const dashboardName = 'Dashboard deleted tab editor';

      await addSearchEmbeddableToDashboard(savedSearchTitle);
      await discover.selectEmbeddableTab('Filtered tab');

      await dashboard.saveDashboard(dashboardName, {
        saveAsNew: true,
        waitDialogIsClosed: true,
        exitFromEditMode: true,
      });

      await removeFilteredTabFromSavedSearch(savedSearchTitle);
      await dashboard.navigateToApp();
      await dashboard.loadSavedDashboard(dashboardName);
      await dashboard.waitForRenderComplete();

      const viewModeCalloutText = await getDeletedTabCalloutText();
      expect(viewModeCalloutText).to.contain('Edit the panel');
      await testSubjects.missingOrFail('docTable');

      await testSubjects.click('discoverEmbeddableDeletedTabEditPanelLink');
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();

      const editModeCalloutText = await getDeletedTabCalloutText();
      expect(editModeCalloutText).to.contain('choose a different tab');
      await testSubjects.missingOrFail('docTable');

      await discover.enterInlineEditing();

      const inlineEditCalloutText = await getDeletedTabCalloutText();
      expect(inlineEditCalloutText).to.contain('choose a different tab');
      const selectorText = await testSubjects.getVisibleText(
        'discoverEmbeddableInlineEditSelectTabAction'
      );
      expect(selectorText).to.contain('(Deleted tab)');
      await testSubjects.missingOrFail('docTable');

      await discover.selectTabFromPopover('Untitled');

      await testSubjects.click('discoverEmbeddableInlineEditApplyButton');
      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
      await testSubjects.existOrFail('docTable');
    });

    describe('read-only user tests', function () {
      // FIPS mode sets defaultRoles to superuser/kibana_admin so testUser.setRoles() cannot
      // reduce privileges to read-only, causing the wrong error message variant to appear
      this.tags('skipFIPS');

      it('should show deleted-tab warning in view mode for read-only users', async () => {
        const savedSearchTitle = 'Discover embeddable deleted tab read only';
        const dashboardName = 'Dashboard deleted tab read only';

        await addSearchEmbeddableToDashboard(savedSearchTitle);
        await discover.selectEmbeddableTab('Filtered tab');

        await dashboard.saveDashboard(dashboardName, {
          saveAsNew: true,
          waitDialogIsClosed: true,
          exitFromEditMode: true,
        });

        await removeFilteredTabFromSavedSearch(savedSearchTitle);
        await dashboard.navigateToApp();
        await dashboard.gotoDashboardLandingPage();

        try {
          await security.testUser.setRoles(['test_logstash_reader', 'global_dashboard_read']);
          await dashboard.loadSavedDashboard(dashboardName);
          await header.waitUntilLoadingHasFinished();
          await dashboard.waitForRenderComplete();

          const viewModeCalloutText = await getDeletedTabCalloutText();
          expect(viewModeCalloutText).to.contain(
            "Contact one of the dashboard's authors to fix it."
          );
          await testSubjects.missingOrFail('docTable');
        } finally {
          await security.testUser.restoreDefaults();
        }
      });
    });
  });
}
