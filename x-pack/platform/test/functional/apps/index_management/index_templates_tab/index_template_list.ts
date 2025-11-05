/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'indexManagement', 'header']);
  const log = getService('log');
  const security = getService('security');
  const testSubjects = getService('testSubjects');

  describe('Index template tab -> templates list', function () {
    before(async () => {
      await log.debug('Navigating to the index templates tab');
      await security.testUser.setRoles(['index_management_user']);
      await pageObjects.common.navigateToApp('indexManagement');

      // Navigate to the templates tab
      await pageObjects.indexManagement.changeTabs('templatesTab');
      await pageObjects.header.waitUntilLoadingHasFinished();
    });

    it('shows warning callout when deleting a managed index template', async () => {
      // Open the flyout for any managed index template
      await pageObjects.indexManagement.clickIndexTemplateNameLink('ilm-history-7');

      // Open the manage context menu
      await testSubjects.click('manageTemplateButton');
      // Click the delete button
      await testSubjects.click('deleteIndexTemplateButton');

      // Check if the callout is displayed
      const calloutExists = await testSubjects.exists('deleteManagedAssetsCallout');
      expect(calloutExists).to.be(true);
    });
  });
};
