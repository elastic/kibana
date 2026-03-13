/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolType } from '@kbn/agent-builder-common';
import type { AgentBuilderUiFtrProviderContext } from '../../../agent_builder/services/functional';

export default function ({ getPageObjects, getService }: AgentBuilderUiFtrProviderContext) {
  const { agentBuilder } = getPageObjects(['agentBuilder']);
  const testSubjects = getService('testSubjects');
  const es = getService('es');

  describe('create tool', function () {
    let testIndexName: string;

    before(async () => {
      testIndexName = `ftr_agent_builder_${Date.now()}`;
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

    it('should create an esql tool', async () => {
      const toolId = `ftr.esql.${Date.now()}`;
      await agentBuilder.navigateToNewTool();
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      await agentBuilder.setToolId(toolId);

      await testSubjects.existOrFail('agentBuilderToolTypeSelect');
      await agentBuilder.selectToolType(ToolType.esql);

      await agentBuilder.setToolDescription('FTR created ES|QL tool');

      await testSubjects.existOrFail('agentBuilderEsqlEditor');
      await agentBuilder.setEsqlQuery('FROM .kibana | LIMIT 1');

      await agentBuilder.saveTool();

      // Search for the tool to handle pagination
      const search = agentBuilder.toolsSearch();
      await search.type(toolId);
      await testSubjects.existOrFail(`agentBuilderToolsTableRow-${toolId}`);
    });

    it('should create an index search tool', async () => {
      const toolId = `ftr.index.${Date.now()}`;
      await agentBuilder.navigateToNewTool();
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      await agentBuilder.setToolId(toolId);

      await testSubjects.existOrFail('agentBuilderToolTypeSelect');
      await agentBuilder.selectToolType(ToolType.index_search);

      await testSubjects.existOrFail('agentBuilderIndexPatternInput');
      await agentBuilder.setIndexPattern(testIndexName);

      await agentBuilder.setToolDescription('FTR created Index Search tool');

      await agentBuilder.saveTool();

      // Search for the tool to handle pagination
      const search = agentBuilder.toolsSearch();
      await search.type(toolId);
      await testSubjects.existOrFail(`agentBuilderToolsTableRow-${toolId}`);
    });
  });
}
