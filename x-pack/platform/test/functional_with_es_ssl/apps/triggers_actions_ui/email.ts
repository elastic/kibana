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

    describe('test form recipient validation', () => {
      it('shows invalid email error for addresses with leading hyphen in local part', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await pageObjects.triggersActionsUI.clickCreateConnectorButton();
        await testSubjects.click('.email-card');

        await testSubjects.setValue('emailFromInput', 'test@test.com');
        await testSubjects.setValue('emailHostInput', 'localhost');
        await testSubjects.setValue('emailPortInput', '1025');
        await testSubjects.click('create-connector-flyout-save-test-btn');
        await testSubjects.click('testConnectorTab');

        const comboBox = await testSubjects.find('toEmailAddressInput');
        const input = await comboBox.findByCssSelector('input');
        await input.type('-user@example.com');
        await input.pressKeys('\uE007');
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const errorText = await testSubjects.getVisibleText('toEmailAddressInput');
        expect(errorText).to.contain('is not valid');
      });

      it('shows invalid email error for addresses with leading hyphen in domain', async () => {
        await pageObjects.common.navigateToApp('triggersActionsConnectors');
        await new Promise((resolve) => setTimeout(resolve, 10000));
        await pageObjects.triggersActionsUI.clickCreateConnectorButton();
        await testSubjects.click('.email-card');

        await testSubjects.setValue('emailFromInput', 'test@test.com');
        await testSubjects.setValue('emailHostInput', 'localhost');
        await testSubjects.setValue('emailPortInput', '1025');
        await testSubjects.click('create-connector-flyout-save-test-btn');
        await testSubjects.click('testConnectorTab');

        const comboBox = await testSubjects.find('toEmailAddressInput');
        const input = await comboBox.findByCssSelector('input');
        await input.type('user@-example.com');
        await input.pressKeys('\uE007');
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const errorText = await testSubjects.getVisibleText('toEmailAddressInput');
        expect(errorText).to.contain('is not valid');
      });
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
