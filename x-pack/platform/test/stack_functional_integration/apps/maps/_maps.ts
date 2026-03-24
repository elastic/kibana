/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function ({
  getService,
  getPageObjects,
  updateBaselines,
}: FtrProviderContext & { updateBaselines: boolean }) {
  const screenshot = getService('screenshots');
  const browser = getService('browser');
  const PageObjects = getPageObjects(['common', 'maps']);

  describe('check Elastic Maps Server', function () {
    before(async function () {
      await PageObjects.maps.loadSavedMap('EMS Test');
      await PageObjects.common.dismissBanner();
      await browser.setScreenshotSize(1000, 1000);
    });

    it('[ElasticMapsService] EMS Test should match screenshot', async function () {
      const percentDifference = await screenshot.compareAgainstBaseline(
        'ems_test',
        updateBaselines
      );
      // This test should show about a 5% difference if it falls back to the online Elastic Maps Service
      // and around 20% if the self-hosted doesn't load/work for some reason. This way we catch both scenarios.
      // Any minor UI changes will be caught in the 1% difference that is allowed for without impacting the map.
      // More info here: https://github.com/elastic/kibana/pull/87070
      expect(percentDifference).to.be.lessThan(0.01);
    });
  });
}
