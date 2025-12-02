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
  apiKey: string;
}

export function ActionsJsmServiceProvider(
  { getService }: FtrProviderContext,
  common: ActionsCommon
) {
  const testSubjects = getService('testSubjects');
  const find = getService('find');
  const browser = getService('browser');

  return {
    async createNewConnector(fields: ConnectorFormFields) {
      await common.openNewConnectorForm('jira-service-management');
      await this.setConnectorFields(fields);

      const flyOutSaveButton = await testSubjects.find('create-connector-flyout-save-btn');
      expect(await flyOutSaveButton.isEnabled()).to.be(true);
      await flyOutSaveButton.click();
    },

    async setConnectorFields({ name, apiKey }: ConnectorFormFields) {
      await testSubjects.setValue('nameInput', name);
      await testSubjects.setValue('secrets.apiKey-input', apiKey);
    },

    async updateConnectorFields(fields: ConnectorFormFields) {
      await this.setConnectorFields(fields);

      const editFlyOutSaveButton = await testSubjects.find('edit-connector-flyout-save-btn');
      expect(await editFlyOutSaveButton.isEnabled()).to.be(true);
      await editFlyOutSaveButton.click();
    },

    async getObjFromJsonEditor() {
      const value = await browser.execute(() => {
        const editor = window.MonacoEnvironment?.monaco.editor.getEditors()[0];
        return editor?.getModel()?.getValue() ?? '';
      });
      return JSON.parse(value);
    },

    async setJsonEditor(value: object) {
      const stringified = JSON.stringify(value);

      await browser.execute((text: string) => {
        const editor = window.MonacoEnvironment?.monaco.editor.getEditors()[0];
        if (editor) {
          editor.getModel()?.setValue(text);
          editor.focus();
        }
      }, stringified);
    },
  };
}
