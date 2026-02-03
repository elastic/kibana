/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const searchSessions = getService('searchSessions');
  const retry = getService('retry');
  const filterBar = getService('filterBar');

  const { common, home, timePicker, header } = getPageObjects([
    'common',
    'timePicker',
    'header',
    'home',
  ]);

  describe('Discover background search', function () {
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

    describe('Classic view', function () {
      it('stores a running search', async () => {
        // Add slow query through DSL so we can background it
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
      });

      describe('when clicking the open background search flyout button', () => {
        it('opens the background search flyout', async () => {
          await searchSessions.openFlyout();
          await searchSessions.expectManagementTable();
        });
      });
    });
  });
}
