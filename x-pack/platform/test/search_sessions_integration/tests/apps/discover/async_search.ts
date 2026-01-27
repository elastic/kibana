/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const queryBar = getService('queryBar');
  const log = getService('log');
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const inspector = getService('inspector');
  const filterBar = getService('filterBar');
  const { discover, common, timePicker, header, context, home, searchSessionsManagement } =
    getPageObjects([
      'discover',
      'common',
      'timePicker',
      'header',
      'context',
      'searchSessionsManagement',
      'home',
    ]);
  const searchSessions = getService('searchSessions');
  const retry = getService('retry');
  const kibanaServer = getService('kibanaServer');
  const toasts = getService('toasts');
  const dataGrid = getService('dataGrid');

  describe('discover async search', () => {
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
      await timePicker.setDefaultAbsoluteRange();
      await header.waitUntilLoadingHasFinished();
    });

    after(async () => {
      await kibanaServer.importExport.unload(
        'x-pack/platform/test/functional/fixtures/kbn_archives/discover/default'
      );
      await common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await header.waitUntilLoadingHasFinished();
      await home.removeSampleDataSet('flights');
      const isInstalled = await home.isSampleDataSetInstalled('flights');
      expect(isInstalled).to.be(false);
    });

    it('search session id should change between searches', async () => {
      const searchSessionId1 = await getSearchSessionId();
      expect(searchSessionId1).not.to.be.empty();
      await queryBar.clickQuerySubmitButton();
      const searchSessionId2 = await getSearchSessionId();
      expect(searchSessionId2).not.to.be(searchSessionId1);
    });

    it('search session id should be picked up from the URL, non existing session id errors out, back button restores a session', async () => {
      let url = await browser.getCurrentUrl();
      const fakeSearchSessionId = '__test__';
      const savedSessionURL = url + `&searchSessionId=${fakeSearchSessionId}`;
      await browser.navigateTo(savedSessionURL);
      await header.waitUntilLoadingHasFinished();
      await testSubjects.existOrFail('discoverErrorCalloutTitle'); // expect error because of fake searchSessionId
      await toasts.dismissAll();
      const searchSessionId1 = await getSearchSessionId();
      expect(searchSessionId1).to.be(fakeSearchSessionId);
      await queryBar.clickQuerySubmitButton();
      await header.waitUntilLoadingHasFinished();
      const searchSessionId2 = await getSearchSessionId();
      expect(searchSessionId2).not.to.be(searchSessionId1);

      // back button should restore the session:
      url = await browser.getCurrentUrl();
      expect(url).not.to.contain('searchSessionId');

      await browser.goBack();

      url = await browser.getCurrentUrl();
      expect(url).to.contain('searchSessionId');
      await header.waitUntilLoadingHasFinished();
      // Note this currently fails, for some reason the fakeSearchSessionId is not restored
      expect(await getSearchSessionId()).to.be(fakeSearchSessionId);

      // back navigation takes discover to fakeSearchSessionId which is in error state
      // clean up page to get out of error state before proceeding to next test
      await toasts.dismissAll();
      await queryBar.clickQuerySubmitButton();
      await header.waitUntilLoadingHasFinished();
    });

    it('navigation to context cleans the session', async () => {
      await timePicker.setCommonlyUsedTime('This_week');
      await dataGrid.clickRowToggle({ rowIndex: 0 });

      await retry.try(async () => {
        const rowActions = await dataGrid.getRowActions();
        if (!rowActions.length) {
          throw new Error('row actions empty, trying again');
        }
        const idxToClick = 1;
        await rowActions[idxToClick].click();
      });

      await context.waitUntilContextLoadingHasFinished();
      await searchSessions.missingOrFail();
    });

    it('relative timerange works', async () => {
      await common.navigateToApp('discover');
      await header.waitUntilLoadingHasFinished();
      const url = await browser.getCurrentUrl();

      // Add slow query through DSL so we can background it
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

      await searchSessions.save();
      const searchSessionId = await getSearchSessionId();
      log.info('searchSessionId', searchSessionId);

      // load URL to restore a saved session
      await searchSessionsManagement.goTo();

      await retry.waitFor('session should be in a completed status', async () => {
        const searchSessionList = await searchSessionsManagement.getList();
        const searchSessionItem = searchSessionList[0];
        return searchSessionItem.status === 'complete';
      });

      const searchSessionListBeforeRestore = await searchSessionsManagement.getList();
      const searchesCountBeforeRestore = searchSessionListBeforeRestore[0].searchesCount;

      // navigate to Discover
      // Instead of clicking the link to navigate to Discover, we load Discover from scratch (just like we did when we
      // ran the search session before saving). This ensures that the same number of requests are made.
      // await searchSessionListBeforeRestore[0].view();
      const restoreUrl = new URL(searchSessionListBeforeRestore[0].mainUrl, url).href;
      await browser.navigateTo(restoreUrl);

      await header.waitUntilLoadingHasFinished();
      expect(await toasts.getCount()).to.be(0); // no session restoration related warnings

      await searchSessionsManagement.goTo();
      const searchSessionListAfterRestore = await searchSessionsManagement.getList();
      const searchesCountAfterRestore = searchSessionListAfterRestore[0].searchesCount;

      expect(searchesCountBeforeRestore).to.be(searchesCountAfterRestore); // no new searches started during restore
    });

    it('should have the search session when navigating to ESQL mode', async () => {
      await common.navigateToApp('discover');
      await discover.selectTextBaseLang();
      await header.waitUntilLoadingHasFinished();
      await testSubjects.click('app-menu-overflow-button');
      expect(await searchSessions.exists()).to.be(true);
    });
  });

  async function getSearchSessionId(): Promise<string> {
    await inspector.open();
    const searchSessionId = await (
      await testSubjects.find('inspectorRequestSearchSessionId')
    ).getAttribute('data-search-session-id');
    await inspector.close();
    return searchSessionId ?? '';
  }
}
