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
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects([
    'common',
    'svlCommonPage',
    'header',
    'dashboard',
    'discover',
    'exports',
    'appMenu',
    'timePicker',
  ]);

  describe('Schedule export menu', () => {
    const suiteDefaultIndex = 'logstash-*';
    let previousDefaultIndex: string | undefined;

    before(async () => {
      // Serverless Observability shows the "Add data" intercept until a data view exists.
      // Load a data view (not a saved dashboard) so Dashboard/Discover actually render.
      const currentDefaultIndex = await kibanaServer.uiSettings.getDefaultIndex();
      previousDefaultIndex =
        typeof currentDefaultIndex === 'string' ? currentDefaultIndex : undefined;
      await esArchiver.loadIfNeeded(
        'src/platform/test/functional/fixtures/es_archiver/logstash_functional'
      );
      await kibanaServer.importExport.load(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await kibanaServer.uiSettings.update({ defaultIndex: suiteDefaultIndex });
      await PageObjects.timePicker.setDefaultAbsoluteRangeViaUiSettings();
      await PageObjects.svlCommonPage.loginAsAdmin();
    });

    after(async () => {
      await kibanaServer.uiSettings.unset('defaultIndex');
      await kibanaServer.importExport.unload(
        'src/platform/test/functional/fixtures/kbn_archiver/discover'
      );
      await PageObjects.timePicker.resetDefaultAbsoluteRangeViaUiSettings();
      if (previousDefaultIndex !== undefined) {
        await kibanaServer.uiSettings.update({ defaultIndex: previousDefaultIndex });
      }
    });

    it('does not show Schedule export on dashboards', async () => {
      // Open a new dashboard directly. The listing create button is not always present
      // in serverless chrome, so going through clickNewDashboard times out.
      await PageObjects.common.navigateToApp('dashboards', { hash: '/create' });
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.appMenu.existOrFail('exportTopNavButton');

      await PageObjects.appMenu.clickMenuItem('exportTopNavButton');
      await testSubjects.missingOrFail('scheduleExport');
    });

    it('still shows Schedule export for Discover CSV', async () => {
      await PageObjects.common.navigateToApp('discover');
      await PageObjects.discover.waitUntilTabIsLoaded();

      await retry.waitFor('the export popover to be opened', async () => {
        if (!(await PageObjects.exports.isExportPopoverOpen())) {
          await PageObjects.appMenu.clickMenuItem('exportTopNavButton');
        }
        return await PageObjects.exports.isExportPopoverOpen();
      });

      expect(await PageObjects.exports.isPopoverItemEnabled('CSV')).to.be(true);
      expect(await PageObjects.exports.isPopoverItemEnabled('scheduledReports')).to.be(true);
    });
  });
};
