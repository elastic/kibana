/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);

  describe('webhook', () => {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('triggersActionsConnectors');
    });

    it('should render the cr and pfx tab for ssl auth', async () => {
      await pageObjects.triggersActionsUI.clickCreateConnectorButton();
      await testSubjects.click('.webhook-card');
      await testSubjects.click('authSSL');

      const certTypeTabs = await find.allByCssSelector(
        '[data-test-subj="webhookCertTypeTabs"] > .euiTab'
      );
      expect(certTypeTabs.length).to.be(2);
      expect(await certTypeTabs[0].getAttribute('data-test-subj')).to.be('webhookCertTypeCRTab');
      expect(await certTypeTabs[1].getAttribute('data-test-subj')).to.be('webhookCertTypePFXTab');
    });
  });
};
