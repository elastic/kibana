/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default ({ getService, getPageObjects }) => {
  const log = getService('log');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common']);
  const retry = getService('retry');

  describe('telemetry', function () {
    before(async () => {
      log.debug('monitoring');
      await browser.setWindowSize(1200, 800);
      await PageObjects.common.navigateToApp('home');
    });
    after(async function () {
      await PageObjects.common.dismissBanner();
    });

    it('should show banner Help us improve the Elastic Stack', async () => {
      await retry.tryForTime(20000, async () => {
        const actualMessage = await PageObjects.common.getWelcomeText();
        log.debug(`### X-Pack Welcome Text: ${actualMessage}`);
        expect(actualMessage).to.contain('Help us improve the Elastic Stack');
      });
    });
  });
};
