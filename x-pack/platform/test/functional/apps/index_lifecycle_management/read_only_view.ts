/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const pageObjects = getPageObjects(['common', 'indexLifecycleManagement']);
  const log = getService('log');
  const retry = getService('retry');
  const security = getService('security');

  describe('Read only view', function () {
    this.tags('skipFIPS');
    before(async () => {
      await security.testUser.setRoles(['read_ilm']);

      await pageObjects.common.navigateToApp('indexLifecycleManagement');
    });
    after(async () => {
      await security.testUser.restoreDefaults();
    });

    it('Loads the app', async () => {
      await log.debug('Checking for page header');
      const headerText = await pageObjects.indexLifecycleManagement.pageHeaderText();
      expect(headerText).to.be('Index Lifecycle Policies');

      const createPolicyButtonExists =
        await pageObjects.indexLifecycleManagement.createPolicyButtonExists();
      expect(createPolicyButtonExists).to.be(false);

      await pageObjects.indexLifecycleManagement.clickPolicyNameLink(0);
      await retry.waitFor('flyout to be visible', async () => {
        const flyoutHeader = await pageObjects.indexLifecycleManagement.flyoutHeader();
        return await flyoutHeader.isDisplayed();
      });
    });
  });
};
