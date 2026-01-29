/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../../ftr_provider_context';
import { ObjectRemover } from '../../../lib/object_remover';
import { getConnectorByName } from './utils';

export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const find = getService('find');
  const pageObjects = getPageObjects(['common', 'triggersActionsUI', 'header']);
  const actions = getService('actions');
  const supertest = getService('supertest');
  const objectRemover = new ObjectRemover(supertest);
  const retry = getService('retry');
  const browser = getService('browser');
  const toasts = getService('toasts');

  describe('webhook', () => {
    beforeEach(async () => {
      await pageObjects.common.navigateToApp('triggersActionsConnectors');
    });

    after(async () => {
      await objectRemover.removeAll();
    });

    it('should create a connector with config and secret headers', async () => {
      const connectorName = 'web';

      await actions.webhook.openCreateConnectorFlyout();
      await actions.webhook.setAuthTypeNone();
      await actions.webhook.setConnectorFields({
        name: connectorName,
        webhookUrlText: 'https://www.example.com',
      });
      await actions.webhook.toggleHeaders();
      await actions.webhook.addHeader();

      const headerKeys = await find.allByCssSelector('[data-test-subj="webhookHeadersKeyInput"]');
      const headerValues = await find.allByCssSelector(
        '[data-test-subj="webhookHeadersValueInput"]'
      );
      const headerInputTypes = await find.allByCssSelector(
        '[data-test-subj="webhookHeaderTypeSelect"]'
      );

      // default + 1 click
      expect(headerKeys.length).to.eql(2);
      expect(headerValues.length).to.eql(2);
      expect(headerInputTypes.length).to.eql(2);

      // Config header
      await headerKeys[0].type('config-key');
      await headerValues[0].type('config-value');

      // Secret header
      await headerKeys[1].type('secret-key');
      await headerValues[1].type('secret-value');
      await headerInputTypes[1].click();
      await (await find.byCssSelector('[data-test-subj="option-secret"]')).click();

      await actions.webhook.saveAndCloseFlyout();

      const toastTitle = await toasts.getTitleAndDismiss();
      expect(toastTitle).to.eql(`Created '${connectorName}'`);

      const connector = await getConnectorByName(connectorName, supertest);
      objectRemover.add(connector.id, 'connector', 'actions');
    });

    it('should render the cr and pfx tab for ssl auth', async () => {
      await actions.webhook.openCreateConnectorFlyout();
      await actions.webhook.setAuthTypeSSL();

      const certTypeTabs = await find.allByCssSelector(
        '[data-test-subj="webhookCertTypeTabs"] > .euiTab'
      );
      expect(certTypeTabs.length).to.be(2);
      expect(await certTypeTabs[0].getAttribute('data-test-subj')).to.be('webhookCertTypeCRTab');
      expect(await certTypeTabs[1].getAttribute('data-test-subj')).to.be('webhookCertTypePFXTab');
    });

    it('connector created via API displays headers as expected', async () => {
      const webhookConnectorName = 'webhook connector with headers';
      const webhook = await actions.api.createConnector({
        name: 'webhook connector with headers',
        config: {
          method: 'post',
          hasAuth: false,
          url: 'https://example.com/webhook',
          headers: {
            configHeader: 'config-value',
          },
        },
        secrets: {
          secretHeaders: {
            secretHeader: 'secretValue', // the value should not be displayed in the UI
          },
        },
        connectorTypeId: '.webhook',
      });

      objectRemover.add(webhook.id, 'connector', 'actions');

      await browser.refresh();

      await pageObjects.triggersActionsUI.searchConnectors(webhookConnectorName);
      await retry.try(async () => {
        const searchResultsBeforeEdit = await pageObjects.triggersActionsUI.getConnectorsList();
        expect(searchResultsBeforeEdit.length).to.eql(1);
      });

      await find.clickByCssSelector('[data-test-subj="connectorsTableCell-name"] button');

      const headerKeys = await find.allByCssSelector('[data-test-subj="webhookHeadersKeyInput"]');
      expect(headerKeys.length).to.eql(2);
      expect(await headerKeys[0].getAttribute('value')).to.be('configHeader');
      expect(await headerKeys[1].getAttribute('value')).to.be('secretHeader');

      const configHeaderValue = await find.allByCssSelector(
        '[data-test-subj="webhookHeadersValueInput"]'
      );
      expect(configHeaderValue.length).to.eql(1);
      expect(await configHeaderValue[0].getAttribute('value')).to.be('config-value');

      const secretHeaderValue = await find.allByCssSelector(
        '[data-test-subj="webhookHeadersSecretValueInput"]'
      );
      expect(secretHeaderValue.length).to.eql(1);

      // as expected, we do not show the passwords
      expect(await secretHeaderValue[0].getAttribute('value')).to.be('');
    });
  });
};
