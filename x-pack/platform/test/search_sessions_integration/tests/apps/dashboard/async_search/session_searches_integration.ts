/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

declare global {
  interface Window {
    /**
     * Debug setting to make requests complete slower than normal. data.search.aggs.shardDelay.enabled has to be set via settings for this to work
     */
    ELASTIC_LENS_DELAY_SECONDS?: number;
  }
}

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const es = getService('es');
  const log = getService('log');
  const browser = getService('browser');
  const { common, dashboard, searchSessionsManagement } = getPageObjects([
    'common',
    'dashboard',
    'searchSessionsManagement',
  ]);
  const toasts = getService('toasts');
  const dashboardPanelActions = getService('dashboardPanelActions');
  const searchSessions = getService('searchSessions');
  const retry = getService('retry');
  const listingTable = getService('listingTable');
  const testSubjects = getService('testSubjects');
  const elasticChart = getService('elasticChart');
  const dashboardExpect = getService('dashboardExpect');

  describe('Session and searches integration', () => {
    before(async function () {
      const body = await es.info();
      if (!body.version.number.includes('SNAPSHOT')) {
        log.debug('Skipping because this build does not have the required shard_delay agg');
        this.skip();
      }
      await common.navigateToApp('dashboard');
    });

    after(async function () {
      await searchSessions.deleteAllSearchSessions();
    });

    it('until session is saved search keepAlive is short, when it is saved, keepAlive is extended and search is saved into the session saved object, when session is extended, searches are also extended', async () => {
      await dashboard.loadSavedDashboard('Delayed 5s');
      await dashboard.waitForRenderComplete();

      const searchResponse = await dashboardPanelActions.getSearchResponseByTitle(
        'Sum of Bytes by Extension (Delayed 5s)'
      );

      const asyncSearchId = searchResponse.id;
      expect(typeof asyncSearchId).to.be('string');

      const asyncExpirationTimeBeforeSessionWasSaved =
        await searchSessions.getAsyncSearchExpirationTime(asyncSearchId);
      expect(asyncExpirationTimeBeforeSessionWasSaved).to.be.lessThan(
        Date.now() + 1000 * 60,
        'expiration time should be less then a minute from now'
      );

      await searchSessions.save({ isSubmitButton: true, withRefresh: true });

      let asyncExpirationTimeAfterSessionWasSaved: number;
      let newAsyncSearchId: string;
      await retry.waitFor('async search keepAlive is extended', async () => {
        const newSearchResponse = await dashboardPanelActions.getSearchResponseByTitle(
          'Sum of Bytes by Extension (Delayed 5s)'
        );

        newAsyncSearchId = newSearchResponse.id;

        asyncExpirationTimeAfterSessionWasSaved = await searchSessions.getAsyncSearchExpirationTime(
          newAsyncSearchId
        );

        return (
          asyncExpirationTimeAfterSessionWasSaved > asyncExpirationTimeBeforeSessionWasSaved &&
          asyncExpirationTimeAfterSessionWasSaved > Date.now() + 1000 * 60
        );
      });

      const savedSessionId = await dashboardPanelActions.getSearchSessionIdByTitle(
        'Sum of Bytes by Extension (Delayed 5s)'
      );

      // check that search saved into the session

      await searchSessionsManagement.goTo();

      const searchSessionList = await searchSessionsManagement.getList();
      const searchSessionItem = searchSessionList.find((session) => session.id === savedSessionId)!;
      expect(searchSessionItem.searchesCount).to.be(1);

      await searchSessionItem.extend();

      const asyncExpirationTimeAfterSessionWasExtended =
        await searchSessions.getAsyncSearchExpirationTime(newAsyncSearchId!);

      expect(asyncExpirationTimeAfterSessionWasExtended).to.be.greaterThan(
        asyncExpirationTimeAfterSessionWasSaved!
      );
    });

    it('When session is deleted, searches are also deleted', async () => {
      await common.navigateToApp('dashboard');
      await dashboard.loadSavedDashboard('Delayed 5s');

      await searchSessions.save({ isSubmitButton: true, withRefresh: true });

      const searchResponse = await dashboardPanelActions.getSearchResponseByTitle(
        'Sum of Bytes by Extension (Delayed 5s)'
      );

      const asyncSearchId = searchResponse.id;
      expect(typeof asyncSearchId).to.be('string');

      const savedSessionId = await dashboardPanelActions.getSearchSessionIdByTitle(
        'Sum of Bytes by Extension (Delayed 5s)'
      );

      // check that search saved into the session
      await searchSessionsManagement.goTo();

      const searchSessionList = await searchSessionsManagement.getList();
      const searchSessionItem = searchSessionList.find((session) => session.id === savedSessionId)!;
      expect(searchSessionItem.searchesCount).to.be(1);
      await searchSessionItem.delete();

      const searchNotFoundError = await searchSessions
        .getAsyncSearchStatus(asyncSearchId)
        .catch((e) => e);
      expect(searchNotFoundError.name).to.be('ResponseError');
      expect(searchNotFoundError.meta.body.error.type).to.be('resource_not_found_exception');
    });

    describe('Slow lens with other bucket', () => {
      before(async function () {
        await common.navigateToApp('dashboard', { insertTimestamp: false });
        await browser.execute(() => {
          window.ELASTIC_LENS_DELAY_SECONDS = 25;
        });
        await elasticChart.setNewChartUiDebugFlag(true);
      });

      after(async function () {
        await browser.execute(() => {
          window.ELASTIC_LENS_DELAY_SECONDS = undefined;
        });
      });

      it('Other bucket should be added to a session when restoring', async () => {
        // not using regular navigation method, because don't want to wait until all panels load
        // await dashboard.loadSavedDashboard('Lens with other bucket');
        await listingTable.clickItemLink('dashboard', 'Lens with other bucket');
        await testSubjects.missingOrFail('dashboardLandingPage');

        await searchSessions.save({ isSubmitButton: true });

        const savedSessionId = await dashboardPanelActions.getSearchSessionIdByTitle(
          'Lens with other bucket'
        );

        await searchSessionsManagement.goTo();

        let searchSessionList = await searchSessionsManagement.getList();
        let searchSessionItem = searchSessionList.find((session) => session.id === savedSessionId)!;
        expect(searchSessionItem.searchesCount).to.be(1);

        await new Promise((resolve) => setTimeout(resolve, 10_000));
        await retry.waitFor('session should be in a completed status', async () => {
          searchSessionList = await searchSessionsManagement.getList();
          searchSessionItem = searchSessionList.find((session) => session.id === savedSessionId)!;
          return searchSessionItem.status === 'complete';
        });

        await searchSessionItem.view();

        // Check that session is still loading
        await retry.waitFor('session restoration warnings related to other bucket', async () => {
          return (await toasts.getCount()) === 1;
        });
        await toasts.dismissAll();

        // check that other bucket requested add to a session
        await searchSessionsManagement.goTo();

        await new Promise((resolve) => setTimeout(resolve, 10_000));
        await retry.waitFor('session should be in a completed status', async () => {
          searchSessionList = await searchSessionsManagement.getList();
          searchSessionItem = searchSessionList.find((session) => session.id === savedSessionId)!;
          return searchSessionItem.status === 'complete';
        });

        await retry.waitFor('the third search should be added to the session', async () => {
          searchSessionList = await searchSessionsManagement.getList();
          searchSessionItem = searchSessionList.find((session) => session.id === savedSessionId)!;
          return searchSessionItem.searchesCount === 3;
        });

        await searchSessionItem.view();
        expect(await toasts.getCount()).to.be(0); // there should be no warnings
        await dashboardExpect.noErrorEmbeddablesPresent();
      });
    });
  });
}
