/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderUiFtrProviderContext } from '../../../agent_builder/services/functional';

export default function ({ getPageObjects, getService }: AgentBuilderUiFtrProviderContext) {
  const { agentBuilder } = getPageObjects(['agentBuilder']);
  const testSubjects = getService('testSubjects');
  const supertest = getService('supertest');

  describe('tools landing page', function () {
    it('should render', async () => {
      await agentBuilder.navigateToToolsLanding();
      await testSubjects.existOrFail('agentBuilderToolsPage');
      await testSubjects.existOrFail('agentBuilderToolsTable');
    });

    it('should bulk delete tools from the table', async () => {
      const timestamp = Date.now();
      const ids = [`ftr.esql.${timestamp}.a`, `ftr.esql.${timestamp}.b`];
      for (const id of ids) {
        await supertest
          .post('/api/agent_builder/tools')
          .set('kbn-xsrf', 'true')
          .send({
            id,
            type: 'esql',
            description: 'bulk delete candidate',
            tags: ['ftr'],
            configuration: { query: 'FROM .kibana | LIMIT 1', params: {} },
          })
          .expect(200);
      }

      await agentBuilder.navigateToToolsLanding();
      await testSubjects.existOrFail('agentBuilderToolsTable');

      // Search for our specific tools to filter the table (avoids pagination issues)
      const search = agentBuilder.toolsSearch();
      await search.type(`ftr.esql.${timestamp}`);

      // Wait for the first tool to appear (ensures search has filtered the results)
      await testSubjects.existOrFail(`agentBuilderToolsTableRow-${ids[0]}`);

      await agentBuilder.bulkDeleteTools(ids);

      await testSubjects.existOrFail('agentBuilderToolsTable');
      for (const id of ids) {
        await testSubjects.missingOrFail(`agentBuilderToolsTableRow-${id}`);
      }
    });
  });
}
