/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, header, dashboard, searchSessionsManagement, timePicker } = getPageObjects([
    'common',
    'header',
    'dashboard',
    'searchSessionsManagement',
    'timePicker',
  ]);
  const searchSessions = getService('searchSessions');
  const retry = getService('retry');

  describe('save a search sessions with relative time', () => {
    before(async () => {
      await common.navigateToApp('dashboard');
    });

    it('Saves and restores a session with relative time ranges', async () => {
      await dashboard.loadSavedDashboard('Delayed 5s');
      await dashboard.waitForRenderComplete();
      await timePicker.setCommonlyUsedTime('This_week');

      await searchSessions.save({ withRefresh: true, isSubmitButton: true });

      // load URL to restore a saved session
      await searchSessionsManagement.goTo();

      // navigate to dashboard
      await new Promise((resolve) => setTimeout(resolve, 5_000));

      let searchSessionItem;
      await retry.waitFor('session should be in a completed status', async () => {
        const searchSessionList = await searchSessionsManagement.getList();
        searchSessionItem = searchSessionList[0];
        return searchSessionItem.status === 'complete';
      });
      await searchSessionItem!.view();

      await header.waitUntilLoadingHasFinished();
      await dashboard.waitForRenderComplete();
    });
  });
}
