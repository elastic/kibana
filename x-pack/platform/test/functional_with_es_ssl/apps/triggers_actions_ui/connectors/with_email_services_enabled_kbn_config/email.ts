/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const find = getService('find');

  describe('Email - with multiple enabled services config', () => {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('triggersActionsConnectors');
    });

    it('should use the kibana config for enabled services', async () => {
      await pageObjects.triggersActionsUI.clickCreateConnectorButton();
      await testSubjects.click('.email-card');
      const emailServicesOptions = await find.allByCssSelector(
        '[data-test-subj="emailServiceSelectInput"] > option'
      );
      expect(emailServicesOptions.length).to.be(3);
      expect(await emailServicesOptions[0].getVisibleText()).to.be(' '); // empty option
      expect(await emailServicesOptions[1].getVisibleText()).to.be('Gmail');
      expect(await emailServicesOptions[2].getVisibleText()).to.be('Amazon SES');
    });
  });
};
