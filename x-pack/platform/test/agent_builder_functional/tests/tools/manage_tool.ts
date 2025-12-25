/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { OneChatUiFtrProviderContext } from '../../../onechat/services/functional';

export default function ({ getPageObjects, getService }: OneChatUiFtrProviderContext) {
  const { onechat } = getPageObjects(['onechat']);
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');

  describe('manage tool', function () {
    it('should edit a tool from the tool details page', async () => {
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

      await onechat.navigateToTool(toolId);
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      await onechat.setToolDescription('FTR updated description');

      await onechat.saveTool();

      // Navigate back to the tool details page and verify edited fields
      await onechat.navigateToTool(toolId);
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      const idValue = await onechat.getToolIdValue();
      expect(idValue).to.be(toolId);
      const descriptionValue = await onechat.getToolDescriptionValue();
      expect(descriptionValue).to.contain('FTR updated description');
    });

    it('should clone a tool from the tool details page', async () => {
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
      await onechat.navigateToTool(toolId);
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      await onechat.openToolContextMenu();
      await onechat.clickToolCloneButton();
      await testSubjects.existOrFail('agentBuilderToolFormPage');

      // Save the cloned tool ID
      const clonedToolId = await onechat.getToolIdValue();

      await onechat.saveTool();

      // After cloning, navigate to the cloned tool details and verify fields
      await onechat.navigateToTool(clonedToolId!);
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      const clonedIdValue = await onechat.getToolIdValue();
      expect(clonedIdValue).to.be(clonedToolId);
      const clonedDescriptionValue = await onechat.getToolDescriptionValue();
      expect(clonedDescriptionValue).to.contain('FTR clone source');
    });

    it('should test a tool from the tool details page', async () => {
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
      await onechat.navigateToTool(toolId);
      await onechat.openToolTestFlyout();
      await onechat.submitToolTest();
      await onechat.waitForToolTestResponseNotEmpty();
    });

    it('should delete a tool from the tool details page', async () => {
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
      await onechat.navigateToTool(toolId);
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      await onechat.openToolContextMenu();
      await onechat.clickToolDeleteButton();
      await onechat.confirmModalConfirm();
      await testSubjects.existOrFail('agentBuilderToolsPage');
      expect(await onechat.isToolInTable(toolId)).to.be(false);
    });

    it('views built-in as read-only', async () => {
      const builtInToolId = 'platform.core.search';
      await onechat.navigateToTool(builtInToolId);
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      await testSubjects.existOrFail('agentBuilderToolReadOnlyBadge');
      await testSubjects.missingOrFail('agentBuilderToolContextMenuButton');
      await testSubjects.missingOrFail('toolFormSaveButton');
    });
  });
}
