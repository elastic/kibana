/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../ftr_provider_context';

export function MachineLearningRuleEditorFlyoutProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');

  return {
    async assertExists() {
      await testSubjects.existOrFail('mlRuleEditorFlyout');
    },

    async assertNotExists() {
      await testSubjects.missingOrFail('mlRuleEditorFlyout');
    },

    async enableScope() {
      await testSubjects.click('mlScopeEnableCheckbox');
    },

    async navigateToFilterListsFromCallout() {
      await testSubjects.click('mlScopeNoFilterListsLink');
      await testSubjects.existOrFail('mlPageFilterListManagement');
    },

    async openScopeFilterSelector() {
      await testSubjects.click('mlScopeExpressionFilterSelector');

      await testSubjects.existOrFail('mlScopeFilterTypeSelect');
      await testSubjects.existOrFail('mlScopeFilterIdSelect');
    },

    async save() {
      await testSubjects.click('mlRuleEditorSaveButton');
    },

    async closeIfOpen() {
      if (await testSubjects.exists('euiFlyoutCloseButton')) {
        await testSubjects.click('euiFlyoutCloseButton');
        await testSubjects.missingOrFail('mlRuleEditorFlyout');
      }
    },
  };
}
