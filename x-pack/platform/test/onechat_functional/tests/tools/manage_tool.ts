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
  const supertest = getService('supertest');

  describe('tool management', function () {
    it('edits', async () => {
      const toolId = `ftr.esql.${Date.now()}`;
      await supertest
        .post('/api/agent_builder/tools')
        .set('kbn-xsrf', 'true')
        .send({
          id: toolId,
          type: 'esql',
          description: 'FTR created tool',
          tags: ['ftr'],
          configuration: { query: 'FROM .kibana | LIMIT 1', params: {} },
        })
        .expect(200);

      await common.navigateToApp(APP_ID, { path: `tools/${toolId}` });
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      // Edit description
      const descriptionEditor = await testSubjects.find('agentBuilderToolDescriptionEditor');
      const descriptionTextarea = await descriptionEditor.findByCssSelector(
        'textarea.euiMarkdownEditorTextArea'
      );
      await descriptionTextarea.clearValue();
      await descriptionTextarea.type('FTR updated description');

      // Save and assert toast
      await testSubjects.click('toolFormSaveButton');
      await testSubjects.existOrFail('toastCloseButton');
    });

    it('clones', async () => {
      const toolId = `ftr.esql.${Date.now()}`;
      await supertest
        .post('/api/agent_builder/tools')
        .set('kbn-xsrf', 'true')
        .send({
          id: toolId,
          type: 'esql',
          description: 'FTR clone source',
          tags: ['ftr'],
          configuration: { query: 'FROM .kibana | LIMIT 1', params: {} },
        })
        .expect(200);
      await common.navigateToApp(APP_ID, { path: `tools/${toolId}` });
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      await testSubjects.click('agentBuilderToolContextMenuButton');
      await testSubjects.click('agentBuilderToolCloneButton');
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      // Save cloned tool and assert success toast
      await testSubjects.click('toolFormSaveButton');
      await testSubjects.existOrFail('toastCloseButton');
    });

    it('tests', async () => {
      const toolId = `ftr.esql.${Date.now()}`;
      await supertest
        .post('/api/agent_builder/tools')
        .set('kbn-xsrf', 'true')
        .send({
          id: toolId,
          type: 'esql',
          description: 'FTR testable',
          tags: ['ftr'],
          configuration: { query: 'FROM .kibana | LIMIT 1', params: {} },
        })
        .expect(200);
      await common.navigateToApp(APP_ID, {
        path: `tools/${toolId}`,
        search: 'open_test_flyout=true',
      });
      // Basic flyout presence check using generic flyout subjects
      await testSubjects.existOrFail('euiFlyoutCloseButton');
    });
    it('deletes', async () => {
      const toolId = `ftr.esql.${Date.now()}`;
      await supertest
        .post('/api/agent_builder/tools')
        .set('kbn-xsrf', 'true')
        .send({
          id: toolId,
          type: 'esql',
          description: 'FTR deletable',
          tags: ['ftr'],
          configuration: { query: 'FROM .kibana | LIMIT 1', params: {} },
        })
        .expect(200);
      await common.navigateToApp(APP_ID, { path: `tools/${toolId}` });
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      await testSubjects.click('agentBuilderToolContextMenuButton');
      await testSubjects.click('agentBuilderToolDeleteButton');
      await testSubjects.click('confirmModalConfirmButton');
      await testSubjects.existOrFail('agentBuilderToolsPage');
    });

    it('views built-in as read-only', async () => {
      // Built-in tool ids are system-owned; navigate to a known builtin and assert read-only state
      const builtInToolId = 'platform.core.search';
      await common.navigateToApp(APP_ID, { path: `tools/${builtInToolId}` });
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      await testSubjects.existOrFail('agentBuilderToolReadOnlyBadge');
      await testSubjects.missingOrFail('agentBuilderToolContextMenuButton');
      await testSubjects.missingOrFail('toolFormSaveButton');
    });
  });
}
