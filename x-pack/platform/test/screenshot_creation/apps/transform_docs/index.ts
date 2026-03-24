/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { esTestConfig } from '@kbn/test';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObject, getService, loadTestFile }: FtrProviderContext) {
  const browser = getService('browser');
  const ml = getService('ml');
  const securityPage = getPageObject('security');

  describe('transform docs', function () {
    this.tags(['transforms']);

    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await browser.setWindowSize(1920, 1080);
      await securityPage.login(
        esTestConfig.getUrlParts().username,
        esTestConfig.getUrlParts().password
      );
    });

    after(async () => {
      await securityPage.forceLogout();
      await ml.testResources.resetKibanaTimeZone();
    });

    loadTestFile(require.resolve('./transform_alerts'));
  });
}
