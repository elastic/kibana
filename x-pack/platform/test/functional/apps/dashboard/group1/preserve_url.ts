/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const { common, dashboard, spaceSelector, header } = getPageObjects([
    'common',
    'dashboard',
    'spaceSelector',
    'header',
  ]);
  const globalNav = getService('globalNav');
  const kibanaServer = getService('kibanaServer');
  const spacesService = getService('spaces');

  describe('preserve url', function () {
    const anotherSpace = 'another-space';

    before(async () => {
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/spaces/multi_space_default_space'
      );
      await spacesService.create({ id: anotherSpace, name: 'Another Space' });
      await kibanaServer.importExport.load(
        'x-pack/test/functional/fixtures/kbn_archiver/spaces/multi_space_another_space',
        { space: anotherSpace }
      );
    });

    after(async () => {
      await spacesService.delete(anotherSpace);
      await kibanaServer.savedObjects.cleanStandardList();
    });

    it('goes back to last opened url', async function () {
      await dashboard.navigateToApp();
      await dashboard.loadSavedDashboard('A Dashboard');
      await common.navigateToApp('home');
      await dashboard.navigateToAppFromAppsMenu();
      await dashboard.loadSavedDashboard('A Dashboard');
      await header.waitUntilLoadingHasFinished();
      const activeTitle = await globalNav.getLastBreadcrumb();
      expect(activeTitle).to.be('A Dashboard');
    });

    it('remembers url after switching spaces', async function () {
      // default space
      await dashboard.navigateToApp();
      await dashboard.loadSavedDashboard('A Dashboard');

      await spaceSelector.openSpacesNav();
      await spaceSelector.clickSpaceAvatar('another-space');
      await spaceSelector.expectHomePage('another-space');

      // other space
      await dashboard.navigateToAppFromAppsMenu();
      await dashboard.loadSavedDashboard('A Dashboard in another space');

      await spaceSelector.openSpacesNav();
      await spaceSelector.clickSpaceAvatar('default');
      await spaceSelector.expectHomePage('default');

      // default space
      await dashboard.navigateToAppFromAppsMenu();
      await dashboard.waitForRenderComplete();
      const activeTitleDefaultSpace = await globalNav.getLastBreadcrumb();
      expect(activeTitleDefaultSpace).to.be('A Dashboard');

      await spaceSelector.openSpacesNav();
      await spaceSelector.clickSpaceAvatar('another-space');
      await spaceSelector.expectHomePage('another-space');

      // other space
      await dashboard.navigateToAppFromAppsMenu();
      await dashboard.waitForRenderComplete();
      const activeTitleOtherSpace = await globalNav.getLastBreadcrumb();
      expect(activeTitleOtherSpace).to.be('A Dashboard in another space');
    });
  });
}
