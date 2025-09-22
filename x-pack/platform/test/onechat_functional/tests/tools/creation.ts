/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../../../functional/ftr_provider_context';

const APP_ID = 'agent_builder';

export default function ({ getPageObjects, getService }: FtrProviderContext) {
  const { common } = getPageObjects(['common']);
  const testSubjects = getService('testSubjects');

  describe('tool creation', function () {
    it('creates an esql tool', async () => {
      await common.navigateToApp(APP_ID, { path: 'tools/new' });
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      await testSubjects.setValue('agentBuilderToolIdInput', `ftr.esql.${Date.now()}`);
      // Select ES|QL type (default is ES|QL, but make explicit)
      await testSubjects.existOrFail('agentBuilderToolTypeSelect');
      // Enter minimal ES|QL query via editor
      await testSubjects.existOrFail('agentBuilderEsqlEditor');
      // Save via primary button in header
      await testSubjects.click('toolFormSaveButton');
      await testSubjects.existOrFail('toastCloseButton');
    });

    it('creates an index search tool', async () => {
      await common.navigateToApp(APP_ID, { path: 'tools/new' });
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      await testSubjects.setValue('agentBuilderToolIdInput', `ftr.index.${Date.now()}`);
      // Switch type to index search
      await testSubjects.existOrFail('agentBuilderToolTypeSelect');
      await testSubjects.selectValue('agentBuilderToolTypeSelect', 'index_search');
      // Configure pattern input
      await testSubjects.existOrFail('onechatIndexPatternInput');
      await testSubjects.setValue('onechatIndexPatternInput', 'kibana_sample_data_ecommerce');
      // Save via primary button in header
      await testSubjects.click('toolFormSaveButton');
      await testSubjects.existOrFail('toastCloseButton');
    });
  });
}
