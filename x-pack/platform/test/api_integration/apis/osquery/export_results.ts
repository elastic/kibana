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
    const actionId = `action-export-${Date.now()}`;
    const queryActionId = `query-export-${Date.now()}`;

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
      query: { term: { action_id: actionId } },
    });
  };

  describe('Export results endpoints', () => {
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

    describe('Live query results export', () => {
      it('returns 400 when format query param is omitted', async () => {
        const response = await supertest
          .post(`/api/osquery/live_queries/${actionId}/results/${queryActionId}/_export`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({});

        expect(response.status).to.be(400);
      });

      it('returns 400 when format query param is invalid', async () => {
        const response = await supertest
          .post(`/api/osquery/live_queries/${actionId}/results/${queryActionId}/_export?format=xml`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({});

        expect(response.status).to.be(400);
        expect(response.body.message).to.match(/format/i);
      });

      it('returns a downloadable ndjson file (may be empty) for a valid request', async () => {
        const response = await supertest
          .post(
            `/api/osquery/live_queries/${actionId}/results/${queryActionId}/_export?format=ndjson`
          )
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({});

        expect(response.status).to.be(200);
        expect(response.headers['content-type']).to.match(/ndjson/);
        expect(response.headers['content-disposition']).to.match(
          /attachment; filename="osquery-results-/
        );
      });

      it('returns a downloadable csv file for a valid request', async () => {
        const response = await supertest
          .post(`/api/osquery/live_queries/${actionId}/results/${queryActionId}/_export?format=csv`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({});

        expect(response.status).to.be(200);
        expect(response.headers['content-type']).to.match(/csv/);
        expect(response.headers['content-disposition']).to.match(/\.csv"/);
      });

      it('returns a downloadable json file for a valid request', async () => {
        const response = await supertest
          .post(
            `/api/osquery/live_queries/${actionId}/results/${queryActionId}/_export?format=json`
          )
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({});

        expect(response.status).to.be(200);
        expect(response.headers['content-disposition']).to.match(/\.json"/);
      });

      it('accepts optional kuery and agentIds in request body', async () => {
        const response = await supertest
          .post(
            `/api/osquery/live_queries/${actionId}/results/${queryActionId}/_export?format=ndjson`
          )
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({
            kuery: 'host.name: "test-host"',
            agentIds: ['test-agent-1'],
          });

        expect(response.status).to.be(200);
      });

      it('returns 400 for a malformed kuery in the request body', async () => {
        const response = await supertest
          .post(`/api/osquery/live_queries/${actionId}/results/${queryActionId}/_export?format=csv`)
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({ kuery: 'field: "unclosed' });

        expect(response.status).to.be(400);
        expect(response.body.message).to.match(/kuery/i);
      });
    });

    describe('Scheduled query results export', () => {
      it('returns 400 when format query param is omitted', async () => {
        const response = await supertest
          .post('/api/osquery/scheduled_results/sched-test-uuid/1/_export')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({});

        expect(response.status).to.be(400);
      });

      it('returns 400 when format query param is invalid', async () => {
        const response = await supertest
          .post('/api/osquery/scheduled_results/sched-test-uuid/1/_export?format=tsv')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({});

        expect(response.status).to.be(400);
      });

      it('returns a downloadable ndjson file (may be empty) for a valid request', async () => {
        const response = await supertest
          .post('/api/osquery/scheduled_results/sched-test-uuid/1/_export?format=ndjson')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({});

        expect(response.status).to.be(200);
        expect(response.headers['content-disposition']).to.match(
          /attachment; filename="osquery-scheduled-results-/
        );
      });

      it('returns a downloadable csv file for a valid request', async () => {
        const response = await supertest
          .post('/api/osquery/scheduled_results/sched-test-uuid/42/_export?format=csv')
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', osqueryPublicApiVersion)
          .send({});

        expect(response.status).to.be(200);
        expect(response.headers['content-type']).to.match(/csv/);
      });
    });
  });
}
