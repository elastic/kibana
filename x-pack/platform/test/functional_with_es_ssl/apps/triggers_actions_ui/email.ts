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
  const supertest = getService('supertest');
  const find = getService('find');
  const retry = getService('retry');

  describe('Email', () => {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('triggersActionsConnectors');
    });

    describe('test form recipient validation', () => {
      let connectorId: string;

      before(async () => {
        const { body } = await supertest
          .post('/api/actions/connector')
          .set('kbn-xsrf', 'foo')
          .send({
            name: 'email-format-validation-test',
            connector_type_id: '.email',
            config: {
              from: 'test@test.com',
              host: 'localhost',
              port: 1025,
              secure: false,
              hasAuth: false,
            },
            secrets: {},
          })
          .expect(200);
        connectorId = body.id;
      });

      after(async () => {
        if (connectorId) {
          await supertest
            .delete(`/api/actions/connector/${connectorId}`)
            .set('kbn-xsrf', 'foo')
            .expect(204);
        }
      });

      it('shows invalid email error for addresses with leading hyphen in local part', async () => {
        await pageObjects.common.navigateToApp('triggersActionsConnectors');
        await pageObjects.triggersActionsUI.searchConnectors('email-format-validation-test');
        await retry.try(async () => {
          const rows = await find.allByCssSelector(
            '[data-test-subj="connectorsTableCell-name"] button'
          );
          expect(rows.length).to.be(1);
        });
        await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');
        await testSubjects.click('testConnectorTab');
        await testSubjects.existOrFail('test-connector-form');

        const comboBox = await testSubjects.find('toEmailAddressInput');
        const input = await comboBox.findByCssSelector('input');
        await input.type('-user@example.com');
        await input.pressKeys('\uE007');

        await retry.try(async () => {
          const errors = await find.allByCssSelector('.euiFormErrorText');
          const messages = await Promise.all(errors.map((el) => el.getVisibleText()));
          expect(messages.join(' ')).to.contain('is not valid');
        });

        await testSubjects.click('edit-connector-flyout-close-btn');
        if (await testSubjects.exists('confirmModalConfirmButton', { timeout: 2000 })) {
          await testSubjects.click('confirmModalConfirmButton');
        }
      });

      it('shows invalid email error for addresses with leading hyphen in domain', async () => {
        await pageObjects.common.navigateToApp('triggersActionsConnectors');
        await pageObjects.triggersActionsUI.searchConnectors('email-format-validation-test');
        await retry.try(async () => {
          const rows = await find.allByCssSelector(
            '[data-test-subj="connectorsTableCell-name"] button'
          );
          expect(rows.length).to.be(1);
        });
        await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');
        await testSubjects.click('testConnectorTab');
        await testSubjects.existOrFail('test-connector-form');

        const comboBox = await testSubjects.find('toEmailAddressInput');
        const input = await comboBox.findByCssSelector('input');
        await input.type('user@-example.com');
        await input.pressKeys('\uE007');

        await retry.try(async () => {
          const errors = await find.allByCssSelector('.euiFormErrorText');
          const messages = await Promise.all(errors.map((el) => el.getVisibleText()));
          expect(messages.join(' ')).to.contain('is not valid');
        });

        await testSubjects.click('edit-connector-flyout-close-btn');
        if (await testSubjects.exists('confirmModalConfirmButton', { timeout: 2000 })) {
          await testSubjects.click('confirmModalConfirmButton');
        }
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
