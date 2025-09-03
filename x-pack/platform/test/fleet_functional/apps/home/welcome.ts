/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const browser = getService('browser');
  const esArchiver = getService('esArchiver');
  const PageObjects = getPageObjects(['common', 'home', 'header']);
  const kibanaServer = getService('kibanaServer');

  describe('Welcome interstitial', () => {
    before(async () => {
      // Need to navigate to page first to clear storage before test can be run
      await PageObjects.common.navigateToUrl('home', undefined);
      await browser.clearLocalStorage();
      await esArchiver.emptyKibanaIndex();
    });

    /**
     * When we run this against a Cloud cluster, we also test the case where Fleet server is running
     * and ingesting elastic_agent data.
     */
    it('is displayed on a fresh install with Fleet setup executed', async () => {
      // Setup Fleet and verify the metrics index pattern was created
      await kibanaServer.request({ path: '/api/fleet/setup', method: 'POST' });

      // Reload the home screen and verify the interstitial is displayed
      await PageObjects.common.navigateToUrl('home', undefined, { disableWelcomePrompt: false });
      await PageObjects.header.waitUntilLoadingHasFinished();

      expect(await PageObjects.home.isWelcomeInterstitialDisplayed()).to.be(true);
    });

    // Pending tests we should add once the FTR supports Elastic Agent / Fleet Server
    it('is still displayed after a Fleet server is enrolled with agent metrics');
    it('is not displayed after an agent is enrolled with system metrics');
    it('is not displayed after a standalone agent is enrolled with system metrics');
  });
}
