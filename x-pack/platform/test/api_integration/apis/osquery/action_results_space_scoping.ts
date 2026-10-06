/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

interface ResultEdge {
  _source?: { space_id?: string; agent?: { id?: string } };
  fields?: Record<string, unknown>;
}

// The action_results endpoint returns its envelope at the top level (not under
// a `data` key like the scheduled-results endpoint).
interface ActionResultsRows {
  edges: ResultEdge[];
  aggregations?: { totalResponded?: number };
}

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const spaces = getService('spaces');
  const osqueryPublicApiVersion = '2023-10-31';

  const actionIndex = '.logs-osquery_manager.actions-default';
  // Live-query action responses are written by osquerybeat to the
  // osquery_manager action.responses data stream. The search strategy only
  // queries this data stream when it actually exists (newDataStreamIndexExists),
  // so the test must create it as a real data stream rather than a plain index.
  const responsesIndex = 'logs-osquery_manager.action.responses-default';
  const indexTemplateName = 'osquery-action-results-space-scoping-it';
  const parentActionId = `action-space-scoping-it-${Date.now()}`;
  const actionId = `query-space-scoping-it-${Date.now()}`;
  // Responses exist for this id, but no action document does.
  const orphanActionId = `orphan-space-scoping-it-${Date.now()}`;

  const otherSpaceId = 'action-space-scoping-it-b';
  const topLevelStampedAgent = 'action-space-scoping-it-agent-a';
  const actionDataStampedAgent = 'action-space-scoping-it-agent-b';
  // Indexed before Kibana stamped `action_data.space_id`: no space field at all.
  const unstampedAgent = 'action-space-scoping-it-agent-c';
  const orphanAgent = 'action-space-scoping-it-agent-d';

  // Install a higher-priority data stream template with the field types the
  // action_results query/aggregation rely on, then (re)create the data stream.
  // The real osquery_manager package template is not installed in this env.
  const recreateResponsesIndex = async () => {
    await es.indices.deleteDataStream({ name: responsesIndex }, { ignore: [404] });
    await es.indices.putIndexTemplate({
      name: indexTemplateName,
      index_patterns: [responsesIndex],
      data_stream: {},
      priority: 600,
      template: {
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            'event.ingested': { type: 'date' },
            action_id: { type: 'keyword' },
            space_id: { type: 'keyword' },
            action_data: { properties: { space_id: { type: 'keyword' } } },
            agent_id: { type: 'keyword' },
            agent: { properties: { id: { type: 'keyword' } } },
            elastic_agent: { properties: { id: { type: 'keyword' } } },
            started_at: { type: 'date' },
            completed_at: { type: 'date' },
            error: { type: 'text', fields: { keyword: { type: 'keyword', ignore_above: 1024 } } },
            action_response: {
              properties: { osquery: { properties: { count: { type: 'long' } } } },
            },
          },
        },
      },
    });
    await es.indices.createDataStream({ name: responsesIndex });
  };

  const seedActionDocument = async () => {
    await es.index({
      index: actionIndex,
      id: parentActionId,
      refresh: 'wait_for',
      document: {
        action_id: parentActionId,
        type: 'INPUT_ACTION',
        input_type: 'osquery',
        '@timestamp': new Date().toISOString(),
        expiration: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        agents: [topLevelStampedAgent, actionDataStampedAgent, unstampedAgent],
        user_id: 'elastic',
        space_id: otherSpaceId,
        queries: [
          {
            action_id: actionId,
            id: 'query-1',
            query: 'select 1;',
            agents: [topLevelStampedAgent, actionDataStampedAgent, unstampedAgent],
          },
        ],
      },
    });
  };

  const seedResponses = async () => {
    const timestamp = new Date().toISOString();
    const base = {
      '@timestamp': timestamp,
      'event.ingested': timestamp,
      started_at: timestamp,
      completed_at: timestamp,
      action_response: { osquery: { count: 1 } },
    };
    const agentFields = (agentId: string) => ({
      agent_id: agentId,
      agent: { id: agentId },
      elastic_agent: { id: agentId },
    });

    const documents = [
      {
        ...base,
        action_id: actionId,
        space_id: otherSpaceId,
        ...agentFields(topLevelStampedAgent),
      },
      {
        ...base,
        action_id: actionId,
        action_data: { space_id: otherSpaceId },
        ...agentFields(actionDataStampedAgent),
      },
      { ...base, action_id: actionId, ...agentFields(unstampedAgent) },
      { ...base, action_id: orphanActionId, ...agentFields(orphanAgent) },
    ];

    for (const document of documents) {
      // Data streams only accept the `create` op type.
      await es.index({ index: responsesIndex, op_type: 'create', refresh: 'wait_for', document });
    }
  };

  const cleanup = async () => {
    await es.deleteByQuery({
      index: actionIndex,
      allow_no_indices: true,
      ignore_unavailable: true,
      refresh: true,
      query: { term: { action_id: parentActionId } },
    });
    await es.indices.deleteDataStream({ name: responsesIndex }, { ignore: [404] });
    await es.indices.deleteIndexTemplate({ name: indexTemplateName }, { ignore: [404] });
  };

  // `spaceId` omitted reads from the default space.
  const fetchActionResults = (id: string, spaceId?: string) => {
    const basePath = spaceId ? `/s/${spaceId}` : '';

    return supertest
      .get(`${basePath}/api/osquery/action_results/${id}?page=0&pageSize=100&kuery=`)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', osqueryPublicApiVersion);
  };

  describe('Action results space scoping', () => {
    before(async () => {
      await spaces.create({ id: otherSpaceId, name: otherSpaceId, disabledFeatures: [] });
      await recreateResponsesIndex();
      await seedActionDocument();
      await seedResponses();
    });
    after(async () => {
      await cleanup();
      await spaces.delete(otherSpaceId);
    });

    // The action document is in the active space, so its responses are read by
    // `action_id` whatever space field they carry, including none.
    it('returns every response of an action from the action space (hits + aggregation)', async () => {
      const { body } = await fetchActionResults(actionId, otherSpaceId).expect(200);
      const { edges, aggregations } = body as ActionResultsRows;
      const serialized = JSON.stringify(edges);

      expect(serialized).to.contain(topLevelStampedAgent);
      expect(serialized).to.contain(actionDataStampedAgent);
      expect(serialized).to.contain(unstampedAgent);
      expect(serialized).not.to.contain(orphanAgent);
      expect(aggregations?.totalResponded).to.eql(3);
    });

    // Field-less responses used to match the default space's missing-field
    // allowance, which exposed another space's results there.
    it('returns 404 for the action from another space', async () => {
      const { body } = await fetchActionResults(actionId).expect(404);

      expect(JSON.stringify(body)).not.to.contain(unstampedAgent);
    });

    it('returns 404 for responses without an action document', async () => {
      await fetchActionResults(orphanActionId).expect(404);
      await fetchActionResults(orphanActionId, otherSpaceId).expect(404);
    });
  });
}
