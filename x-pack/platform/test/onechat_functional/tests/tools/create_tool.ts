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
  const es = getService('es');

  describe('tool creation', function () {
    let testIndexName: string;

    before(async () => {
      testIndexName = `ftr_onechat_${Date.now()}`;
      await es.indices.create({ index: testIndexName });
      await es.index({
        index: testIndexName,
        document: { message: 'hello world', numeric: 1, '@timestamp': new Date().toISOString() },
      });
      await es.index({
        index: testIndexName,
        document: { message: 'second doc', numeric: 2, '@timestamp': new Date().toISOString() },
      });
      await es.indices.refresh({ index: testIndexName });
    });

    after(async () => {
      try {
        await es.indices.delete({ index: testIndexName });
      } catch (e) {
        // ignore
      }
    });

    it('creates an esql tool', async () => {
      await common.navigateToApp(APP_ID, { path: 'tools/new' });
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      await testSubjects.setValue('agentBuilderToolIdInput', `ftr.esql.${Date.now()}`);

      await testSubjects.existOrFail('agentBuilderToolTypeSelect');
      await testSubjects.selectValue('agentBuilderToolTypeSelect', 'esql');

      await testSubjects.existOrFail('agentBuilderEsqlEditor');
      await monacoEditor.setCodeEditorValue('FROM .kibana | LIMIT 1');

      const descriptionEditor = await testSubjects.find('agentBuilderToolDescriptionEditor');
      const descriptionTextarea = await descriptionEditor.findByCssSelector(
        'textarea.euiMarkdownEditorTextArea'
      );
      await descriptionTextarea.type('FTR created ES|QL tool');

      await testSubjects.click('toolFormSaveButton');
      await testSubjects.existOrFail('toastCloseButton');
    });

    it('creates an index search tool', async () => {
      await common.navigateToApp(APP_ID, { path: 'tools/new' });
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      await testSubjects.setValue('agentBuilderToolIdInput', `ftr.index.${Date.now()}`);

      await testSubjects.existOrFail('agentBuilderToolTypeSelect');
      await testSubjects.selectValue('agentBuilderToolTypeSelect', 'index_search');

      await testSubjects.existOrFail('onechatIndexPatternInput');
      await testSubjects.setValue('onechatIndexPatternInput', testIndexName);

      const descriptionEditor = await testSubjects.find('agentBuilderToolDescriptionEditor');
      const descriptionTextarea = await descriptionEditor.findByCssSelector(
        'textarea.euiMarkdownEditorTextArea'
      );
      await descriptionTextarea.type('FTR created Index Search tool');

      await testSubjects.click('toolFormSaveButton');
      await testSubjects.existOrFail('toastCloseButton');
    });
  });
}
