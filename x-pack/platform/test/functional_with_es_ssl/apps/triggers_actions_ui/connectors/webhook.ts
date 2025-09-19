/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';

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

    it('should render the config headers correctly', async () => {
      await pageObjects.triggersActionsUI.clickCreateConnectorButton();
      await testSubjects.click('.webhook-card');
      await testSubjects.click('webhookViewHeadersSwitch');

      await testSubjects.existOrFail('webhookHeaderText');

      const httpHeadersTitle = await find.byCssSelector('[data-test-subj="webhookHeaderText"]');
      expect(await httpHeadersTitle.getVisibleText()).to.be('HTTP headers');

      await testSubjects.existOrFail('webhookAddHeaderButton');
      await testSubjects.click('webhookAddHeaderButton');

      const headerKey = await find.byCssSelector('[data-test-subj="webhookHeadersKeyInput"]');
      const headerValue = await find.byCssSelector('[data-test-subj="webhookHeadersValueInput"]');
      const headerValueInputType = await headerValue.getAttribute('type');
      const typeSelector = await find.byCssSelector('[data-test-subj="webhookHeaderTypeSelect"]');

      expect(await headerKey.isDisplayed()).to.be(true);
      expect(await headerValue.isDisplayed()).to.be(true);
      expect(headerValueInputType).to.be('text');
      expect(await typeSelector.isDisplayed()).to.be(true);
    });

    it('should render the secret headers correctly', async () => {
      await pageObjects.triggersActionsUI.clickCreateConnectorButton();
      await testSubjects.click('.webhook-card');
      await testSubjects.click('webhookViewHeadersSwitch');

      await testSubjects.existOrFail('webhookAddHeaderButton');
      await testSubjects.click('webhookAddHeaderButton');

      await testSubjects.click('webhookHeaderTypeSelect');
      const secretOption = await find.byCssSelector('[data-test-subj="option-secret"]');
      await secretOption.click();

      const headerKey = await find.byCssSelector('[data-test-subj="webhookHeadersKeyInput"]');
      const headerValue = await find.byCssSelector(
        '[data-test-subj="webhookHeadersSecretValueInput"]'
      );
      const headerValueInputType = await headerValue.getAttribute('type');
      const encryptedHeaderBadge = await find.byCssSelector(
        '[data-test-subj="encryptedHeadersBadge"]'
      );

      expect(await headerKey.isDisplayed()).to.be(true);
      expect(await headerValue.isDisplayed()).to.be(true);
      expect(headerValueInputType).to.be('password');
      expect(await encryptedHeaderBadge.isDisplayed()).to.be(true);
    });
  });
};
