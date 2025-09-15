/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);

  describe('Email', () => {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('triggersActionsConnectors');
    });

    it('should use the kibana config for aws ses defaults', async () => {
      await new Promise((resolve) => setTimeout(resolve, 10000));
      await pageObjects.triggersActionsUI.clickCreateConnectorButton();
      await testSubjects.click('.email-card');
      await testSubjects.selectValue('emailServiceSelectInput', 'ses');

      await testSubjects.waitForAttributeToChange(
        'emailHostInput',
        'value',
        'email-smtp.us-east-1.amazonaws.com'
      );
      expect(await testSubjects.getAttribute('emailPortInput', 'value')).to.be('465');
      expect(await testSubjects.getAttribute('emailSecureSwitch', 'aria-checked')).to.be('true');
    });
  });
};
