/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../ftr_provider_context';
import { awsSesConfig } from './config';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);

  describe('Email - with AWS SES Kibana config', () => {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('triggersActionsConnectors');
    });

    it('should use the kibana config for aws ses', async () => {
      await pageObjects.triggersActionsUI.clickCreateConnectorButton();
      await testSubjects.click('.email-card');
      await testSubjects.selectValue('emailServiceSelectInput', 'ses');

      await testSubjects.waitForAttributeToChange('emailHostInput', 'value', awsSesConfig.host);
      expect(await testSubjects.getAttribute('emailPortInput', 'value')).to.be(
        awsSesConfig.port.toString()
      );
      expect(await testSubjects.getAttribute('emailSecureSwitch', 'aria-checked')).to.be('true');
    });
  });
};
