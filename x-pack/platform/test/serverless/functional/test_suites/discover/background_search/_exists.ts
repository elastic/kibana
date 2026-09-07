/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const kibanaServer = getService('kibanaServer');
  const searchSessions = getService('searchSessions');

  const { common, unifiedFieldList, svlCommonPage } = getPageObjects([
    'common',
    'unifiedFieldList',
    'svlCommonPage',
  ]);

  describe('Discover background search', function () {
    before(async () => {
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await svlCommonPage.loginAsAdmin();

      await common.navigateToApp('discover');
      await unifiedFieldList.waitUntilSidebarHasLoaded();
    });

    describe('when in discover', () => {
      it('renders the save to background button', async () => {
        await searchSessions.sendToBackgroundButtonExists();
      });
    });

    describe('when clicking the open background search flyout button', () => {
      it('opens the background search flyout', async () => {
        await searchSessions.openFlyout();
        await searchSessions.expectManagementTable();
      });
    });
  });
}
