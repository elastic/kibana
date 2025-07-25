/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export default function ({ getService, getPageObjects }) {
  describe('APM smoke test', function ampsmokeTest() {
    const browser = getService('browser');
    const testSubjects = getService('testSubjects');
    const PageObjects = getPageObjects(['common', 'timePicker', 'header']);
    const find = getService('find');
    const log = getService('log');
    const retry = getService('retry');

    before(async () => {
      await browser.setWindowSize(1400, 1400);
      await PageObjects.common.navigateToApp('apm');
      await PageObjects.header.waitUntilLoadingHasFinished();
      await PageObjects.timePicker.setCommonlyUsedTime('Last_1 year');
      await PageObjects.header.waitUntilLoadingHasFinished();
    });

    it('can navigate to APM app', async () => {
      await testSubjects.existOrFail('apmMainContainer', {
        timeout: 10000,
      });
      // wait for this last change on the page;
      // <caption class="euiScreenReaderOnly euiTableCaption">This table contains 1 rows out of 1 rows; Page 1 of 1.</caption>
      // but "<caption class="euiScreenReaderOnly euiTableCaption">" always exists so we have to wait until there's text
      await retry.waitForWithTimeout('The APM table has a caption', 5000, async () => {
        return (await (await find.byCssSelector('caption')).getAttribute('innerHTML')).includes(
          'This table contains '
        );
      });

      await find.clickByDisplayedLinkText('apm-a-rum-test-e2e-general-usecase');
      log.debug('### apm smoke test passed');
      await find.clickByLinkText('general-usecase-initial-p-load');
      log.debug('### general use case smoke test passed');
    });
  });
}
