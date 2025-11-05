/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { ActionsCommon } from './common';

export interface ConnectorFormFields {
  name: string;
  webhookUrlText: string;
}

export function ActionsWebhookServiceProvider(
  { getService }: FtrProviderContext,
  common: ActionsCommon
) {
  const testSubjects = getService('testSubjects');

  return {
    async openCreateConnectorFlyout() {
      await common.openNewConnectorForm('webhook');
    },

    async setConnectorFields({ name, webhookUrlText }: ConnectorFormFields) {
      await testSubjects.setValue('nameInput', name);
      await testSubjects.setValue('webhookUrlText', webhookUrlText);
    },

    async setAuthTypeNone() {
      await testSubjects.click('authNone');
    },

    async setAuthTypeSSL() {
      await testSubjects.click('authSSL');
    },

    async saveAndCloseFlyout() {
      const flyOutSaveButton = await testSubjects.find('create-connector-flyout-save-btn');
      expect(await flyOutSaveButton.isEnabled()).to.be(true);
      await flyOutSaveButton.click();
    },

    async toggleHeaders() {
      await testSubjects.click('webhookViewHeadersSwitch');
    },

    async addHeader() {
      await testSubjects.click('webhookAddHeaderButton');
    },
  };
}
