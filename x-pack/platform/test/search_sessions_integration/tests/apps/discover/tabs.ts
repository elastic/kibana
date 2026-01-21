/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

const CLASSIC_BACKGROUND_SEARCH_NAME = 'Classic background search';
const ESQL_BACKGROUND_SEARCH_NAME = 'ESQL background search';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const queryBar = getService('queryBar');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const searchSessions = getService('searchSessions');
  const filterBar = getService('filterBar');
  const monacoEditor = getService('monacoEditor');

  const { common, home, header, timePicker, searchSessionsManagement, discover, unifiedTabs } =
    getPageObjects([
      'common',
      'timePicker',
      'header',
      'home',
      'searchSessionsManagement',
      'discover',
      'unifiedTabs',
    ]);

  describe('Discover tabs', function () {
    // Load the kibana sample data flights data set
    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/platform/test/functional/fixtures/kbn_archives/discover/default'
      );
      await kibanaServer.uiSettings.replace({
        enableESQL: true,
      });
      await common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await retry.tryForTime(10000, async () => {
        await home.addSampleDataSet('flights');
        const isInstalled = await home.isSampleDataSetInstalled('flights');
        expect(isInstalled).to.be(true);
      });
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
    });

    // This before is just to store a classic search session that we can later restore
    before(async () => {
      await timePicker.setCommonlyUsedTime('Last_24 hours');
      await filterBar.addDslFilter(
        JSON.stringify({
          error_query: {
            indices: [
              {
                error_type: 'none',
                name: '*',
                stall_time_seconds: 5,
              },
            ],
          },
        }),
        false
      );

      await searchSessions.save({ withRefresh: true });
      await discover.waitForDocTableLoadingComplete();

      await searchSessions.openFlyout();
      const list = await searchSessionsManagement.getList();
      await list[0].rename(CLASSIC_BACKGROUND_SEARCH_NAME);

      await searchSessions.closeFlyout();
    });

    // This before is just to store an ESQL search session that we can later restore
    before(async () => {
      await discover.selectTextBaseLang();

      await monacoEditor.setCodeEditorValue(
        'FROM kibana_sample_data_flights | LIMIT 1 | WHERE DELAY(5000ms)'
      );

      await searchSessions.save({ withRefresh: true });
      await discover.waitForDocTableLoadingComplete();

      await retry.waitFor('the ESQL search session to be created', async () => {
        await searchSessions.openFlyout();
        const list = await searchSessionsManagement.getList();
        await searchSessions.closeFlyout();
        return list.length % 2 === 0;
      });

      await searchSessions.openFlyout();
      const list = await searchSessionsManagement.getList();
      await list[0].rename(ESQL_BACKGROUND_SEARCH_NAME);

      await searchSessions.closeFlyout();
    });

    after(async () => {
      await searchSessions.deleteAllSearchSessions();
    });

    describe('when restoring a background search', () => {
      describe('from a classic search', () => {
        it('restores it in a new tab', async () => {
          await searchSessions.openFlyout();
          const list = await searchSessionsManagement.getList();
          const classicSearch = list.find((s) => s.name === CLASSIC_BACKGROUND_SEARCH_NAME);
          expect(classicSearch).to.be.ok();
          await classicSearch?.view();
          const tab = await unifiedTabs.getSelectedTab();
          expect(tab).to.be.ok();
          expect(tab?.label).to.be(CLASSIC_BACKGROUND_SEARCH_NAME);

          await unifiedTabs.closeTab(1);
        });
      });

      describe('from a ESQL search', () => {
        it('restores it in a new tab', async () => {
          await searchSessions.openFlyout();
          const list = await searchSessionsManagement.getList();
          const esqlSearch = list.find((s) => s.name === ESQL_BACKGROUND_SEARCH_NAME);
          expect(esqlSearch).to.be.ok();
          await esqlSearch?.view();
          const tab = await unifiedTabs.getSelectedTab();
          expect(tab).to.be.ok();
          expect(tab?.label).to.be(ESQL_BACKGROUND_SEARCH_NAME);

          await unifiedTabs.closeTab(1);
        });
      });
    });

    describe('when a tab is first created', () => {
      it('can save a new search session', async () => {
        await unifiedTabs.createNewTab();
        await discover.selectTextBaseLang();

        await monacoEditor.setCodeEditorValue(
          'FROM kibana_sample_data_flights | LIMIT 1 | WHERE DELAY(5000ms)'
        );

        await searchSessions.save({ withRefresh: true });
        await unifiedTabs.closeTab(1);
      });
    });

    describe('when going back to a tab', () => {
      it('can save a new search session', async () => {
        // Tab 2
        await unifiedTabs.createNewTab();
        await discover.selectTextBaseLang();
        await monacoEditor.setCodeEditorValue(
          'FROM kibana_sample_data_flights | LIMIT 1 | WHERE DELAY(5000ms)'
        );

        // Tab 3
        await unifiedTabs.createNewTab();

        // Go back to tab 2
        await unifiedTabs.selectTab(1);

        // Save a search session
        await searchSessions.save({ withRefresh: true });

        // Close tabs
        await unifiedTabs.closeTab(1);
        await unifiedTabs.closeTab(1);
      });

      describe('when a session was restored in', () => {
        it('should NOT load again', async () => {
          // Open a search session
          await searchSessions.openFlyout();
          const list = await searchSessionsManagement.getList();
          const esqlSearch = list.find((s) => s.name === ESQL_BACKGROUND_SEARCH_NAME);
          expect(esqlSearch).to.be.ok();
          await esqlSearch?.view();
          await discover.waitForDocTableLoadingComplete();

          // Go to another tab
          await unifiedTabs.selectTab(0);

          // Go back to the tab with the restored search session
          await unifiedTabs.selectTab(1);

          // Check that the doc table is NOT loading
          await discover.expectDocTableToBeLoaded();

          // Close the tab
          await unifiedTabs.closeTab(1);
        });
      });

      describe('after opening a search session', () => {
        it('should NOT load again', async () => {
          // Run a query on a new tab
          await unifiedTabs.createNewTab();
          await discover.selectTextBaseLang();
          await monacoEditor.setCodeEditorValue(
            'FROM kibana_sample_data_flights | LIMIT 1 | WHERE DELAY(5000ms)'
          );
          await queryBar.clickQuerySubmitButton();
          await discover.waitForDocTableLoadingComplete();

          // Open a search session
          await searchSessions.openFlyout();
          const list = await searchSessionsManagement.getList();
          const esqlSearch = list.find((s) => s.name === ESQL_BACKGROUND_SEARCH_NAME);
          expect(esqlSearch).to.be.ok();
          await esqlSearch?.view();
          await discover.waitForDocTableLoadingComplete();

          // Go back to the tab where we ran a query
          await unifiedTabs.selectTab(1);
          await discover.expectDocTableToBeLoaded();

          // Close tabs
          await unifiedTabs.closeTab(2);
          await unifiedTabs.selectTab(1);
        });
      });
    });
  });
}
