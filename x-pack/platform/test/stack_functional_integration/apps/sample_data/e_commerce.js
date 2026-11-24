/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ getService, getPageObjects }) {
  describe('eCommerce Sample Data', function sampleData() {
    const browser = getService('browser');
    const PageObjects = getPageObjects(['common', 'home']);
    const testSubjects = getService('testSubjects');
    const retry = getService('retry');

    before(async () => {
      await browser.setWindowSize(1200, 800);
      await PageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
        insertTimestamp: false,
      });
      await PageObjects.common.sleep(3000);
    });

    it('install eCommerce sample data', async function installECommerceData() {
      // Not home.addSampleDataSet: its 20s budget has to cover the ~15s before its click lands as
      // well as the install, so a slightly slow install fails it
      await retry.try(async () => {
        // A previous run against the same stack leaves it installed
        if (await PageObjects.home.isSampleDataSetInstalled('ecommerce')) {
          return;
        }

        // The accordion is uncontrolled and re-collapses when the card list loads async.
        // A single find and click, unlike testSubjects.click's own 120s retry, so a click on a
        // collapsed accordion fails back to here to reopen it
        await PageObjects.home.openSampleDataAccordion();
        await (await testSubjects.find('addSampleDataSetecommerce', 5000)).click();
      });
      await retry.waitForWithTimeout('ecommerce sample data to be installed', 120_000, () =>
        PageObjects.home.isSampleDataSetInstalled('ecommerce')
      );
      // verify it's installed by finding the remove link
      await testSubjects.find('removeSampleDataSetecommerce');
    });
  });
}
