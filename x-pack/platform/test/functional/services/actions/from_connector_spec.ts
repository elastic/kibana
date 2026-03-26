/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';
import type { ActionsCommon } from './common';

export function ActionsConnectorFromSpecServiceProvider(
  { getService }: FtrProviderContext,
  common: ActionsCommon
) {
  const testSubjects = getService('testSubjects');

  return {
    async openCreateConnectorFlyout() {
      await common.openNewConnectorForm('alienvault-otx');
    },
    async setConnectorFields({ name, token }: { name: string; token: string }) {
      await testSubjects.setValue('nameInput', name);
      await testSubjects.setValue('generator-field-secrets-X-OTX-API-KEY', token);
    },
    async saveAndCloseFlyout() {
      const flyOutSaveButton = await testSubjects.find('create-connector-flyout-save-btn');
      expect(await flyOutSaveButton.isEnabled()).to.be(true);
      await flyOutSaveButton.click();
    },
  };
}
