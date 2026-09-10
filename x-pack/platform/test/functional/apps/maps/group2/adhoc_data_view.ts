/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * Purpose: Verify map renders with adhoc data view
 *
 * Migration: Replace with unit test. Verify that adhoc data views are created by `whenReady` in
 * x-pack/platform/plugins/shared/maps/public/routes/map_page/saved_map/saved_map.ts
 */
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const security = getService('security');
  const { maps } = getPageObjects(['maps']);

  describe('maps adhoc data view', () => {
    before(async () => {
      await security.testUser.setRoles(['global_maps_all', 'test_logstash_reader'], {
        skipBrowserRefresh: true,
      });
      await maps.loadSavedMap('adhoc data view');
    });

    it('should render saved map with adhoc data view', async () => {
      const tooltipText = await maps.getLayerTocTooltipMsg('adhocDataView');
      expect(tooltipText).to.equal(
        'adhocDataView\nFound 908 documents.\nResults narrowed by global search\nResults narrowed by global time'
      );
    });

    after(async () => {
      await security.testUser.restoreDefaults();
    });
  });
}
