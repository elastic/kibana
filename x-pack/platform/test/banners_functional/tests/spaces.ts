/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const spacesService = getService('spaces');
  const kibanaServer = getService('kibanaServer');
  const PageObjects = getPageObjects([
    'common',
    'security',
    'banners',
    'settings',
    'spaceSelector',
  ]);

  describe('per-spaces banners', () => {
    before(async () => {
      await spacesService.create({
        id: 'another-space',
        name: 'Another Space',
        disabledFeatures: [],
      });
      await kibanaServer.uiSettings.replace(
        {
          'banners:textContent': 'default space banner text',
        },
        { space: 'default' }
      );
      await PageObjects.security.login(undefined, undefined, {
        expectSpaceSelector: true,
      });
    });
    after(async () => {
      await spacesService.delete('another-space');
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('displays the space-specific banner within the space', async () => {
      await PageObjects.common.navigateToApp('home');

      expect(await PageObjects.banners.isTopBannerVisible()).to.eql(true);
      expect(await PageObjects.banners.getTopBannerText()).to.eql('default space banner text');
    });

    it('displays the global banner within another space', async () => {
      await PageObjects.common.navigateToApp('home', { basePath: '/s/another-space' });

      expect(await PageObjects.banners.isTopBannerVisible()).to.eql(true);
      expect(await PageObjects.banners.getTopBannerText()).to.eql('global banner text');
    });

    it('displays the global banner on the login page', async () => {
      await PageObjects.security.forceLogout();
      await PageObjects.common.navigateToApp('login');

      expect(await PageObjects.banners.isTopBannerVisible()).to.eql(true);
      expect(await PageObjects.banners.getTopBannerText()).to.eql('global banner text');
    });
  });
}
