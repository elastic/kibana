/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getPageObjects }: FtrProviderContext) {
  const pageObjects = getPageObjects(['common', 'home', 'svlCommonPage']);

  // Failing - test user permission issue?
  // https://github.com/elastic/kibana/issues/248690
  describe.skip('Sample data in serverless', function () {
    before(async () => {
      await pageObjects.svlCommonPage.loginWithPrivilegedRole();
    });

    after(async () => {
      await pageObjects.home.removeSampleDataSet('ecommerce');
    });

    it('Sample data loads', async () => {
      await pageObjects.common.navigateToUrl('home', '/tutorial_directory/sampleData', {
        useActualUrl: true,
      });
      await pageObjects.home.addSampleDataSet('ecommerce');
      const ecommerce = await pageObjects.home.isSampleDataSetInstalled('ecommerce');
      expect(ecommerce).toBe(true);
    });
  });
}
