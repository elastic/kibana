/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  const actionIndex = '.logs-osquery_manager.actions-default';

  const createActionDoc = async (overrides: Record<string, unknown> = {}) => {
    const actionId = `history-action-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const queryActionId = `history-query-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    await es.index({
      index: actionIndex,
      id: actionId,
      refresh: 'wait_for',
      document: {
        action_id: actionId,
        type: 'INPUT_ACTION',
        input_type: 'osquery',
        '@timestamp': new Date().toISOString(),
        expiration: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        agent_selection: { all: true },
        agents: ['test-agent-1'],
        user_id: 'elastic',
        queries: [
          {
            action_id: queryActionId,
            id: 'query-1',
            query: 'select * from uptime;',
            agents: ['test-agent-1'],
          },
        ],
        ...overrides,
      },
    });

    return { actionId, queryActionId };
  };

  const deleteActionDoc = async (actionId: string) => {
    await es.deleteByQuery({
      index: actionIndex,
      allow_no_indices: true,
      ignore_unavailable: true,
      refresh: true,
      query: {
        term: {
          action_id: actionId,
        },
      },
    });
  };

  describe('Unified history', () => {
    const createdActionIds: string[] = [];

    before(async () => {
      // Seed two live query action documents
      for (let i = 0; i < 2; i++) {
        const { actionId } = await createActionDoc();
        createdActionIds.push(actionId);
      }
    });

    after(async () => {
      for (const actionId of createdActionIds) {
        await deleteActionDoc(actionId);
      }
    });

    it('returns unified history with expected response shape', async () => {
      const response = await supertest
        .get('/api/osquery/history')
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .expect(200);

      expect(response.body).to.have.property('data');
      expect(response.body).to.have.property('hasMore');
      expect(response.body.data).to.be.an(Array);
      expect(typeof response.body.hasMore).to.be('boolean');
    });

    it('supports pageSize parameter', async () => {
      const response = await supertest
        .get('/api/osquery/history?pageSize=1')
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .expect(200);

      expect(response.body.data.length).to.be(1);
    });

    it('supports sourceFilters parameter for live queries', async () => {
      const response = await supertest
        .get('/api/osquery/history?sourceFilters=live')
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .expect(200);

      expect(response.body).to.have.property('data');
      expect(response.body.data).to.be.an(Array);

      // All returned rows should be live source type
      for (const row of response.body.data) {
        expect(row.sourceType).to.be('live');
      }
    });

    it('rejects invalid sourceFilters', async () => {
      await supertest
        .get('/api/osquery/history?sourceFilters=invalid')
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .expect(400);
    });
  });
}
