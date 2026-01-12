/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
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
      const ids = [`ftr.esql.${Date.now()}.a`, `ftr.esql.${Date.now()}.b`];
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
      await agentBuilder.bulkDeleteTools(ids);

      await testSubjects.existOrFail('agentBuilderToolsTable');
      for (const id of ids) {
        expect(await agentBuilder.isToolInTable(id)).to.be(false);
      }
    });
  });
}
