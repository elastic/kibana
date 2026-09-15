/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');
  const PageObjects = getPageObjects([
    'common',
    'svlCommonPage',
    'header',
    'dashboard',
    'discover',
    'reporting',
    'exports',
  ]);

  describe('Schedule export menu', () => {
    before(async () => {
      await PageObjects.svlCommonPage.loginAsAdmin();
    });

    it('does not show Schedule export on dashboards', async () => {
      await PageObjects.dashboard.navigateToApp();
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.dashboard.gotoDashboardLandingPage();
      await PageObjects.dashboard.clickNewDashboard();
      await PageObjects.header.waitUntilLoadingHasFinished();

      await PageObjects.reporting.openExportPopover();
      await testSubjects.missingOrFail('scheduleExport');
    });

    it('still shows Schedule export for Discover CSV', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilTabIsLoaded();

      await PageObjects.reporting.openExportPopover();
      await retry.waitFor('the export popover to be opened', async () => {
        return await PageObjects.exports.isExportPopoverOpen();
      });

      expect(await PageObjects.exports.isPopoverItemEnabled('CSV')).to.be(true);
      expect(await PageObjects.exports.isPopoverItemEnabled('scheduledReports')).to.be(true);
    });
  });
};
