/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { INITIAL_SEARCH_SESSION_REST_VERSION } from '@kbn/data-plugin/server';
import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const monacoEditor = getService('monacoEditor');
  const searchSessions = getService('searchSessions');
  const toasts = getService('toasts');
  const testSubjects = getService('testSubjects');
  const security = getService('security');

  const { common, unifiedFieldList, discover, home, searchSessionsManagement } = getPageObjects([
    'common',
    'unifiedFieldList',
    'discover',
    'home',
    'searchSessionsManagement',
  ]);

  describe('Discover background search notifications', function () {
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
      await unifiedFieldList.waitUntilSidebarHasLoaded();
      await discover.selectTextBaseLang();
    });

    afterEach(async () => {
      await toasts.dismissAll();
      await searchSessions.deleteAllSearchSessions();
    });

    it('shows a completion toast for background search', async () => {
      await monacoEditor.setCodeEditorValue(
        'FROM kibana_sample_data_flights | LIMIT 10 | WHERE DELAY(1000ms)'
      );

      await searchSessions.save({ withRefresh: true });

      await searchSessionsManagement.goTo();
      await retry.waitFor('session should be in a completed status', async () => {
        const searchSessionList = await searchSessionsManagement.getList();
        return searchSessionList[0].status === 'complete';
      });

      await retry.waitFor('completion toast link should appear', async () => {
        return await testSubjects.exists('backgroundSearchCompletedToastLink');
      });
    });

    it('shows a failure toast for background search', async () => {
      await common.navigateToApp('discover');
      await unifiedFieldList.waitUntilSidebarHasLoaded();
      await discover.selectTextBaseLang();

      await monacoEditor.setCodeEditorValue(
        'FROM kibana_sample_data_flights | WHERE DELAY(1000ms) | LIMIT 10'
      );
      await searchSessions.save({ withRefresh: true });

      const sessionId = await retry.waitFor('session id should be available', async () => {
        const { body } = await security.testUserSupertest
          .post('/internal/session/_find')
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_SEARCH_SESSION_REST_VERSION)
          .set('kbn-xsrf', 'anything')
          .set('kbn-system-request', 'true')
          .send({
            page: 1,
            perPage: 1,
            sortField: 'created',
            sortOrder: 'desc',
          })
          .expect(200);

        const latestSessionId = body.saved_objects?.[0]?.id;
        return latestSessionId ? latestSessionId : false;
      });

      await security.testUserSupertest
        .post(`/internal/session/${sessionId}/cancel`)
        .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_SEARCH_SESSION_REST_VERSION)
        .set('kbn-xsrf', 'anything')
        .set('kbn-system-request', 'true')
        .expect(200);

      await searchSessionsManagement.goTo();
      await retry.waitFor('session should be in a cancelled status', async () => {
        const searchSessionList = await searchSessionsManagement.getList();
        return searchSessionList[0].status === 'cancelled';
      });

      await retry.waitFor('failure toast link should appear', async () => {
        return await testSubjects.exists('backgroundSearchFailedToastLink');
      });
    });
  });
}
