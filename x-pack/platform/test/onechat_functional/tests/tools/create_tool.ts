/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ToolType } from '@kbn/onechat-common';
import type { OneChatUiFtrProviderContext } from '../../../onechat/services/functional';

export default function ({ getPageObjects, getService }: OneChatUiFtrProviderContext) {
  const { onechat } = getPageObjects(['onechat']);
  const testSubjects = getService('testSubjects');
  const es = getService('es');

  describe('create tool', function () {
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

    it('should create an esql tool', async () => {
      const toolId = `ftr.esql.${Date.now()}`;
      await onechat.navigateToNewTool();
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      await onechat.setToolId(toolId);

      await testSubjects.existOrFail('agentBuilderToolTypeSelect');
      await onechat.selectToolType(ToolType.esql);

      await onechat.setToolDescription('FTR created ES|QL tool');

      await testSubjects.existOrFail('agentBuilderEsqlEditor');
      await onechat.setEsqlQuery('FROM .kibana | LIMIT 1');

      await onechat.saveTool();

      expect(await onechat.isToolInTable(toolId)).to.be(true);
    });

    it('should create an index search tool', async () => {
      const toolId = `ftr.index.${Date.now()}`;
      await onechat.navigateToNewTool();
      await testSubjects.existOrFail('agentBuilderToolFormPage');
      await onechat.setToolId(toolId);

      await testSubjects.existOrFail('agentBuilderToolTypeSelect');
      await onechat.selectToolType(ToolType.index_search);

      await testSubjects.existOrFail('onechatIndexPatternInput');
      await onechat.setIndexPattern(testIndexName);

      await onechat.setToolDescription('FTR created Index Search tool');

      await onechat.saveTool();

      expect(await onechat.isToolInTable(toolId)).to.be(true);
    });
  });
}
