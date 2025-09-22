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
  const monacoEditor = getService('monacoEditor');

  describe('tool creation', function () {
    it('creates an esql tool', async () => {
      await common.navigateToApp(APP_ID, { path: 'tools/new' });
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      await testSubjects.setValue('agentBuilderToolIdInput', `ftr.esql.${Date.now()}`);
      // Select ES|QL type (default is ES|QL, but make explicit)
      await testSubjects.existOrFail('agentBuilderToolTypeSelect');
      await testSubjects.selectValue('agentBuilderToolTypeSelect', 'esql');
      // Enter minimal ES|QL query via editor
      await testSubjects.existOrFail('agentBuilderEsqlEditor');
      await monacoEditor.setCodeEditorValue('FROM .kibana | LIMIT 1');
      // Description is required
      const descriptionEditor = await testSubjects.find('agentBuilderToolDescriptionEditor');
      const descriptionTextarea = await descriptionEditor.findByCssSelector(
        'textarea.euiMarkdownEditorTextArea'
      );
      await descriptionTextarea.type('FTR created ES|QL tool');
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
      await testSubjects.setValue('onechatIndexPatternInput', '.kibana*');
      // Description is required
      const descriptionEditor = await testSubjects.find('agentBuilderToolDescriptionEditor');
      const descriptionTextarea = await descriptionEditor.findByCssSelector(
        'textarea.euiMarkdownEditorTextArea'
      );
      await descriptionTextarea.type('FTR created Index Search tool');
      // Save via primary button in header
      await testSubjects.click('toolFormSaveButton');
      await testSubjects.existOrFail('toastCloseButton');
    });
  });
}
