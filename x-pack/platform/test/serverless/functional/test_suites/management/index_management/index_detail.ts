/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['svlCommonPage', 'common', 'indexManagement', 'header']);
  const browser = getService('browser');
  const security = getService('security');
  const testIndexName = `index-ftr-test-${Math.random()}`;
  describe('Index Details ', function () {
    this.tags(['skipSvlSearch']);
    before(async () => {
      await security.testUser.setRoles(['index_management_user']);
      await pageObjects.svlCommonPage.loginAsAdmin();
      await pageObjects.indexManagement.navigateToIndexManagementTab('indices');
    });

    it('renders the indices tab', async () => {
      const url = await browser.getCurrentUrl();
      expect(url).to.contain(`/indices`);
    });
    it('can create an index', async () => {
      await pageObjects.indexManagement.clickCreateIndexButton();
      await pageObjects.indexManagement.setCreateIndexName(testIndexName);
      await pageObjects.indexManagement.clickCreateIndexSaveButton();
      await pageObjects.indexManagement.expectIndexToExist(testIndexName);
    });
    describe('can view index details', function () {
      it('index with no documents', async () => {
        // Open the details page for the index created in this suite rather than relying on
        // the first row in the indices table (which can vary depending on existing indices).
        await pageObjects.indexManagement.manageIndex(testIndexName);
        await pageObjects.indexManagement.changeManageIndexTab('showOverviewIndexMenuButton');
        await pageObjects.indexManagement.indexDetailsPage.expectIndexDetailsPageIsLoaded();
        await pageObjects.indexManagement.indexDetailsPage.expectTabsExists();
      });
      it('can add mappings', async () => {
        await pageObjects.indexManagement.indexDetailsPage.changeTab('indexDetailsTab-mappings');
        await pageObjects.indexManagement.indexDetailsPage.expectIndexDetailsMappingsAddFieldToBeEnabled();
      });
      it('can edit settings', async () => {
        await pageObjects.indexManagement.indexDetailsPage.changeTab('indexDetailsTab-settings');
        await pageObjects.indexManagement.indexDetailsPage.expectEditSettingsToBeEnabled();
      });
    });
  });
};
