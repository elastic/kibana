/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

export default function ({ getService, getPageObjects }) {
  const { common, maps } = getPageObjects(['common', 'maps']);
  const security = getService('security');
  const from = 'Mar 1, 2015 @ 00:00:00.000';
  const to = 'Mar 1, 2016 @ 00:00:00.000';

  describe('vector styling', () => {
    before(async () => {
      await security.testUser.setRoles(['test_logstash_reader', 'global_maps_all']);
      await maps.loadSavedMap('document example');
      await common.setTime({ from, to });
    });

    after(async () => {
      await maps.refreshAndClearUnsavedChangesWarning();
      await security.testUser.restoreDefaults();
      await common.unsetTime();
    });

    describe('categorical styling', () => {
      before(async () => {
        await maps.openLayerPanel('logstash');
      });

      it('should provide auto complete suggestions', async () => {
        await maps.setStyleByValue('fillColor', 'machine.os.raw');
        await maps.selectCustomColorRamp('fillColor');
        const suggestions = await maps.getCategorySuggestions();
        expect(suggestions.trim().split('\n').join()).to.equal('ios,osx,win 7,win 8,win xp');
      });
    });
  });
}
