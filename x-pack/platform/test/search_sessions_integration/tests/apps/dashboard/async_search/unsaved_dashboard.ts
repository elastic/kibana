/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const log = getService('log');
  const searchSessions = getService('searchSessions');
  const kibanaServer = getService('kibanaServer');
  const retry = getService('retry');
  const monacoEditor = getService('monacoEditor');

  const { common, home, timePicker, header, discover, dashboard, searchSessionsManagement } =
    getPageObjects([
      'common',
      'timePicker',
      'header',
      'home',
      'discover',
      'dashboard',
      'dashboardControls',
      'searchSessionsManagement',
    ]);

  async function addFromLibrary() {
    await testSubjects.click('dashboardAddTopNavButton');
    await testSubjects.click('dashboardAddFromLibraryButton');
    await testSubjects.setValue('savedObjectFinderSearchInput', 'Unsaved dashboard slow query');
    await testSubjects.click('savedObjectTitleUnsaved-dashboard-slow-query');
  }

  async function openBackgroundSearchWhenReady() {
    await retry.waitFor('the background search to be completed', async () => {
      const _list = await searchSessionsManagement.getList();
      return _list[0].status === 'complete';
    });

    const list = await searchSessionsManagement.getList();
    await list[0].view();
  }

  describe('saves a search session for unsaved dashboard', () => {
    describe('with a discover session', () => {
      // Add the sample dataset
      before(async () => {
        await kibanaServer.uiSettings.replace({
          enableESQL: true,
        });

        await common.navigateToUrl('home', '/tutorial_directory/sampleData', {
          useActualUrl: true,
        });
        await retry.try(async () => {
          await home.addSampleDataSet('flights');
          const isInstalled = await home.isSampleDataSetInstalled('flights');
          expect(isInstalled).to.be(true);
        });
        log.debug('Sample data installed');
      });

      // Save a slow query to a discover session
      before(async () => {
        await common.navigateToApp('discover');
        await header.waitUntilLoadingHasFinished();

        await timePicker.setCommonlyUsedTime('This_week');
        await discover.selectTextBaseLang();
        await monacoEditor.setCodeEditorValue(
          'FROM kibana_sample_data_flights | LIMIT 1 | WHERE DELAY(1500ms)'
        );
        await testSubjects.clickWhenNotDisabledWithoutRetry('querySubmitButton');
        await discover.waitUntilSearchingHasFinished();
        await discover.saveSearch('Unsaved dashboard slow query');
      });

      afterEach(async () => {
        await common.navigateToApp('dashboard');
        await testSubjects.click('discard-unsaved-New-Dashboard');
        await testSubjects.click('confirmModalConfirmButton');
      });

      it('should be restored when opening from the background search', async () => {
        await common.navigateToApp('dashboard');
        await dashboard.clickCreateDashboardPrompt();

        await addFromLibrary();
        await searchSessions.save({ isSubmitButton: true });
        await dashboard.waitForRenderComplete();

        await searchSessions.openFlyoutFromToast();
        await openBackgroundSearchWhenReady();

        await dashboard.verifyNoRenderErrors();
      });

      describe('when the dashboard is also discarded', async () => {
        it('should still restore the session', async () => {
          await common.navigateToApp('dashboard');
          await dashboard.clickCreateDashboardPrompt();

          await addFromLibrary();
          await searchSessions.save({ isSubmitButton: true });
          await dashboard.waitForRenderComplete();

          await common.navigateToApp('dashboard');
          await testSubjects.click('discard-unsaved-New-Dashboard');
          await testSubjects.click('confirmModalConfirmButton');

          await searchSessionsManagement.goTo();
          await openBackgroundSearchWhenReady();

          await dashboard.verifyNoRenderErrors();
        });
      });
    });
  });
}
