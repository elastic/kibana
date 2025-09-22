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

  describe('tools table', function () {
    it('renders', async () => {
      await common.navigateToApp(APP_ID, { path: 'tools' });
      await testSubjects.existOrFail('agentBuilderToolsPage');
      await testSubjects.existOrFail('agentBuilderToolsTable');
    });

    it('bulk deletes', async () => {
      // Arrange: create two editable tools
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

      await common.navigateToApp(APP_ID, { path: 'tools' });
      await testSubjects.existOrFail('agentBuilderToolsTable');

      // Select all (excludes readonly tools internally) and bulk delete
      await testSubjects.click('agentBuilderToolsSelectAllButton');
      await testSubjects.click('agentBuilderToolsBulkDeleteButton');
      // Confirm modal is the shared EUI confirm modal; use standard testSubjects
      await testSubjects.click('confirmModalConfirmButton');

      // Assert the table re-renders; optionally verify quick actions are not present for deleted ids
      await testSubjects.existOrFail('agentBuilderToolsTable');
    });
  });
}
