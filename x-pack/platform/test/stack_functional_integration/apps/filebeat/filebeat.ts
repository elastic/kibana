/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../functional/ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  describe('check filebeat', function () {
    const retry = getService('retry');
    const kibanaServer = getService('kibanaServer');
    const PageObjects = getPageObjects(['common', 'discover', 'timePicker']);

    it('filebeat- should have hit count GT 0', async function () {
      await kibanaServer.uiSettings.update({
        'timepicker:timeDefaults': `{ "from": "now-5y", "to": "now"}`,
      });
      await PageObjects.common.navigateToApp('discover', { insertTimestamp: false });
      await PageObjects.discover.selectIndexPattern('filebeat-*');
      await retry.try(async () => {
        const hitCount = await PageObjects.discover.getHitCountInt();
        expect(hitCount).to.be.greaterThan(0);
      });
    });
  });
}
