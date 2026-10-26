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
  apiUrl: string;
  apiKey: string;
}

export function ActionsOpsgenieServiceProvider(
  { getService }: FtrProviderContext,
  common: ActionsCommon
) {
  const testSubjects = getService('testSubjects');
  const browser = getService('browser');
  const retry = getService('retry');

  return {
    async createNewConnector(fields: ConnectorFormFields) {
      await common.openNewConnectorForm('opsgenie');
      await this.setConnectorFields(fields);

      const flyOutSaveButton = await testSubjects.find('create-connector-flyout-save-btn');
      expect(await flyOutSaveButton.isEnabled()).to.be(true);
      await flyOutSaveButton.click();
    },

    async setConnectorFields({ name, apiUrl, apiKey }: ConnectorFormFields) {
      await testSubjects.setValue('nameInput', name);
      await retry.try(async () => {
        await testSubjects.setValue('config.apiUrl-input', apiUrl);
      });
      await testSubjects.setValue('secrets.apiKey-input', apiKey);
    },

    async updateConnectorFields(fields: ConnectorFormFields) {
      await this.setConnectorFields(fields);

      const editFlyOutSaveButton = await testSubjects.find('edit-connector-flyout-save-btn');
      expect(await editFlyOutSaveButton.isEnabled()).to.be(true);
      await editFlyOutSaveButton.click();
    },

    async getObjFromJsonEditor() {
      // The JSON editor is lazy-loaded inside a Suspense boundary. Wait for Monaco
      // to mount inside the container before reading the value.
      let value = '';
      await retry.waitFor('json editor to be ready', async () => {
        value = await browser.execute(() => {
          const container = document.querySelector('[data-test-subj="actionJsonEditor"]');
          const editor = window.MonacoEnvironment?.monaco.editor
            .getEditors()
            .find((e: any) => container?.contains(e.getDomNode()));
          return editor?.getModel()?.getValue() ?? '';
        });
        return value.length > 0;
      });
      return JSON.parse(value);
    },

    async setJsonEditor(value: object) {
      const stringified = JSON.stringify(value);

      await retry.waitFor('json editor to be ready for writing', async () => {
        return browser.execute((text: string) => {
          const container = document.querySelector('[data-test-subj="actionJsonEditor"]');
          const editor = window.MonacoEnvironment?.monaco.editor
            .getEditors()
            .find((e: any) => container?.contains(e.getDomNode()));
          if (!editor) {
            return false;
          }
          editor.getModel()?.setValue(text);
          editor.focus();
          return true;
        }, stringified);
      });
    },
  };
}
