/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../ftr_provider_context';

/**
 * Purpose: Verify maps app auto opens layer wizard with URL parameter 'openLayerWizard''
 *
 * Migration: Replace with unit test
 */
export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common, maps } = getPageObjects(['common', 'maps']);
  const retry = getService('retry');

  describe('Auto open file upload wizard in maps app', () => {
    before(async () => {
      await common.navigateToUrlWithBrowserHistory(
        'maps',
        '/map',
        '?openLayerWizard=uploadGeoFile'
      );
    });

    it('should upload form exist', async () => {
      await retry.waitFor(
        `Add layer panel to be visible`,
        async () => await maps.isLayerAddPanelOpen()
      );
    });
  });
}
