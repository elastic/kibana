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
  const osqueryPublicApiVersion = '2023-10-31';

  const actionIndex = '.logs-osquery_manager.actions-default';

  const createActionDoc = async () => {
    const actionId = `action-${Date.now()}`;
    const queryActionId = `query-${Date.now()}`;

    await es.index({
      index: actionIndex,
      id: actionId,
      refresh: 'wait_for',
      document: {
        action_id: actionId,
        '@timestamp': new Date().toISOString(),
        expiration: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        agent_selection: { all: true },
        agents: ['test-agent-1'],
        user_id: 'elastic',
        queries: [
          {
            action_id: queryActionId,
            id: 'query-1',
            query: 'select 1;',
            agents: ['test-agent-1'],
          },
        ],
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

  describe('Live queries', () => {
    let actionId: string;
    let queryActionId: string;

    before(async () => {
      const created = await createActionDoc();
      actionId = created.actionId;
      queryActionId = created.queryActionId;
    });

    after(async () => {
      if (actionId) {
        await deleteActionDoc(actionId);
      }
    });

    it('fetches live query details by action id', async () => {
      const detailsResponse = await supertest
        .get(`/api/osquery/live_queries/${actionId}`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', osqueryPublicApiVersion);

      expect(detailsResponse.status).to.be(200);
      expect(detailsResponse.body.data.action_id).to.be(actionId);
      expect(detailsResponse.body.data).to.have.property('queries');
      expect(detailsResponse.body.data.queries).to.be.an('array');
      expect(detailsResponse.body.data.queries[0].action_id).to.be(queryActionId);
    });

    it('fetches live query results for specific query', async () => {
      const resultsResponse = await supertest
        .get(`/api/osquery/live_queries/${actionId}/results/${queryActionId}`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', osqueryPublicApiVersion);

      expect(resultsResponse.status).to.be(200);
      expect(resultsResponse.body).to.have.property('data');
      expect(resultsResponse.body.data).to.have.property('edges');
      expect(resultsResponse.body.data).to.have.property('total');
    });
  });
}
