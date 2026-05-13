/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { generateUniqueKey } from '../../lib/get_test_data';
import { ObjectRemover } from '../../lib/object_remover';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const testSubjects = getService('testSubjects');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const find = getService('find');
  const retry = getService('retry');
  const comboBox = getService('comboBox');
  const browser = getService('browser');
  const supertest = getService('supertest');
  const actions = getService('actions');

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

    describe('test form recipient validation', () => {
      const objectRemover = new ObjectRemover(supertest);

      const createEmailConnector = async (name: string) =>
        actions.api.createConnector({
          name,
          config: { service: '__json', from: 'me@example.com', hasAuth: false },
          secrets: {},
          connectorTypeId: '.email',
        });

      const openTestTabFor = async (connectorName: string) => {
        await pageObjects.common.navigateToApp('triggersActionsConnectors');
        await pageObjects.triggersActionsUI.searchConnectors(connectorName);
        await retry.try(async () => {
          const list = await pageObjects.triggersActionsUI.getConnectorsList();
          expect(list.length).to.eql(1);
        });
        await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');
        await find.clickByCssSelector('[data-test-subj="testConnectorTab"]');
        await testSubjects.existOrFail('test-connector-form');
      };

      const fillSubjectAndMessage = async () => {
        await testSubjects.setValue('subjectInput', 'test subject');
        await testSubjects.setValue('messageTextArea', 'test message');
      };

      const closeFlyout = async () => {
        await testSubjects.click('edit-connector-flyout-close-btn');
        // The connector flyout pops up a "discard unsaved changes" confirm
        // modal when the form is dirty (subject/message filled). Acknowledge
        // it so the flyout actually closes.
        if (await testSubjects.exists('confirmModalConfirmButton', { timeout: 2000 })) {
          await testSubjects.click('confirmModalConfirmButton');
        }
        await find.waitForDeletedByCssSelector(
          '[data-test-subj="edit-connector-flyout-close-btn"]'
        );
      };

      afterEach(async () => {
        await objectRemover.removeAll();
      });

      it('disables Run and shows the recipients-required error when To/Cc/Bcc are all empty', async () => {
        const connectorName = generateUniqueKey();
        const created = await createEmailConnector(connectorName);
        objectRemover.add(created.id, 'connector', 'actions');
        await browser.refresh();

        await openTestTabFor(connectorName);
        await fillSubjectAndMessage();

        // Touch and blur the To combobox so EUI surfaces the field-level error.
        const toComboBox = await testSubjects.find('toEmailAddressInput');
        await toComboBox.click();
        await testSubjects.click('edit-connector-flyout-header');

        await retry.try(async () => {
          const errors = await find.allByCssSelector('.euiFormErrorText');
          const messages = await Promise.all(errors.map((el) => el.getVisibleText()));
          expect(messages).to.contain('At least one recipient is required.');
        });

        expect(await testSubjects.isEnabled('executeActionButton')).to.be(false);

        await closeFlyout();
      });

      it('disables Run when the only To entry is whitespace', async () => {
        const connectorName = generateUniqueKey();
        const created = await createEmailConnector(connectorName);
        objectRemover.add(created.id, 'connector', 'actions');
        await browser.refresh();

        await openTestTabFor(connectorName);
        await fillSubjectAndMessage();

        await comboBox.setCustom('toEmailAddressInput', '   ');
        await testSubjects.click('edit-connector-flyout-header');

        await retry.try(async () => {
          const errors = await find.allByCssSelector('.euiFormErrorText');
          const messages = await Promise.all(errors.map((el) => el.getVisibleText()));
          expect(messages).to.contain('At least one recipient is required.');
        });

        expect(await testSubjects.isEnabled('executeActionButton')).to.be(false);

        await closeFlyout();
      });

      it('clears the recipients-required error when only Cc has a valid recipient', async () => {
        const connectorName = generateUniqueKey();
        const created = await createEmailConnector(connectorName);
        objectRemover.add(created.id, 'connector', 'actions');
        await browser.refresh();

        await openTestTabFor(connectorName);
        await fillSubjectAndMessage();

        // Trigger the recipients-required error first by touching+blurring the
        // empty To combobox so EUI surfaces the field-level error message.
        const toComboBox = await testSubjects.find('toEmailAddressInput');
        await toComboBox.click();
        await testSubjects.click('edit-connector-flyout-header');

        await retry.try(async () => {
          const errors = await find.allByCssSelector('.euiFormErrorText');
          const messages = await Promise.all(errors.map((el) => el.getVisibleText()));
          expect(messages).to.contain('At least one recipient is required.');
        });

        // Adding a valid Cc must clear the recipients-required error in all
        // three of To / Cc / Bcc rows. We can't assert the Run button becomes
        // enabled here because the email connector form unconditionally marks
        // itself as modified on load (see email_connector.tsx#fetchConfig),
        // which keeps `executeEnabled` false irrespective of recipient state.
        await testSubjects.click('emailAddCcButton');
        await comboBox.setCustom('ccEmailAddressInput', 'cc@example.com');

        await retry.try(async () => {
          const errors = await find.allByCssSelector('.euiFormErrorText');
          const messages = await Promise.all(errors.map((el) => el.getVisibleText()));
          expect(messages).to.not.contain('At least one recipient is required.');
        });

        await closeFlyout();
      });
    });
  });
};
