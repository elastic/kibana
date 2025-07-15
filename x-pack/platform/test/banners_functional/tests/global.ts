/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['common', 'security', 'banners']);

  describe('global pages', () => {
    it('displays the global banner on the login page', async () => {
      await PageObjects.common.navigateToApp('login');

      expect(await PageObjects.banners.isTopBannerVisible()).to.eql(true);
      expect(await PageObjects.banners.getTopBannerText()).to.eql('global banner text');
    });
  });
}
