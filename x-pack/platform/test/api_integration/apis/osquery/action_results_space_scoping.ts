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

  // Live-query action responses are written by osquerybeat to the
  // osquery_manager action.responses data stream. The search strategy only
  // queries this data stream when it actually exists (newDataStreamIndexExists),
  // so the test must create it as a real data stream rather than a plain index.
  const responsesIndex = 'logs-osquery_manager.action.responses-default';
  const indexTemplateName = 'osquery-action-results-space-scoping-it';
  const actionId = `action-space-scoping-it-${Date.now()}`;

  const spaceAAgent = 'action-space-scoping-it-agent-a';
  const spaceBAgent = 'action-space-scoping-it-agent-b';
  // Responses whose originating space survived only inside the action `data` blob
  // that osquerybeat copies onto the document as `action_data`.
  const actionDataDefaultAgent = 'action-space-scoping-it-agent-c';
  const actionDataOtherSpaceAgent = 'action-space-scoping-it-agent-d';
  const otherSpaceId = 'action-space-scoping-it-b';

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
            // Mirrors actionResponsesMapping: the fallback gates a space-isolation
            // boundary, so it must not depend on dynamic mapping being enabled.
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

  const seedResponses = async () => {
    const timestamp = new Date().toISOString();
    const base = {
      '@timestamp': timestamp,
      'event.ingested': timestamp,
      started_at: timestamp,
      completed_at: timestamp,
      action_id: actionId,
      action_response: { osquery: { count: 1 } },
    };

    const documents = [
      {
        ...base,
        space_id: 'default',
        agent_id: spaceAAgent,
        agent: { id: spaceAAgent },
        elastic_agent: { id: spaceAAgent },
      },
      {
        ...base,
        space_id: otherSpaceId,
        agent_id: spaceBAgent,
        agent: { id: spaceBAgent },
        elastic_agent: { id: spaceBAgent },
      },
      // Kibana's top-level `space_id` on the Fleet action never reaches the agent,
      // so a real live-query response arrives with the space only in `action_data`.
      // These two documents are the ones the fallback exists for: the first must be
      // readable from the default space, the second must never be.
      {
        ...base,
        action_data: { space_id: 'default' },
        agent_id: actionDataDefaultAgent,
        agent: { id: actionDataDefaultAgent },
        elastic_agent: { id: actionDataDefaultAgent },
      },
      {
        ...base,
        action_data: { space_id: otherSpaceId },
        agent_id: actionDataOtherSpaceAgent,
        agent: { id: actionDataOtherSpaceAgent },
        elastic_agent: { id: actionDataOtherSpaceAgent },
      },
    ];

    for (const document of documents) {
      // Data streams only accept the `create` op type.
      await es.index({ index: responsesIndex, op_type: 'create', refresh: 'wait_for', document });
    }
  };

  const deleteResponses = async () => {
    await es.indices.deleteDataStream({ name: responsesIndex }, { ignore: [404] });
    await es.indices.deleteIndexTemplate({ name: indexTemplateName }, { ignore: [404] });
  };

  // `spaceId` omitted reads from the default space; passing one exercises the
  // named-space path the fallback exists to restore.
  const fetchActionResults = async (spaceId?: string) => {
    const basePath = spaceId ? `/s/${spaceId}` : '';
    const { body } = await supertest
      .get(`${basePath}/api/osquery/action_results/${actionId}?page=0&pageSize=100&kuery=`)
      .set('kbn-xsrf', 'true')
      .set('elastic-api-version', osqueryPublicApiVersion)
      .expect(200);

    return body as ActionResultsRows;
  };

  describe('Action results space scoping', () => {
    before(async () => {
      await spaces.create({ id: otherSpaceId, name: otherSpaceId, disabledFeatures: [] });
      await recreateResponsesIndex();
      await seedResponses();
    });
    after(async () => {
      await deleteResponses();
      await spaces.delete(otherSpaceId);
    });

    it('returns only active-space responses (hits + aggregation)', async () => {
      const body = await fetchActionResults();
      const { edges, aggregations } = body;
      const spaceIds = (edges ?? []).map(
        (edge) => edge._source?.space_id ?? (edge.fields?.space_id as string[] | undefined)?.[0]
      );

      // The default-space response is returned; the other-space one is filtered out.
      expect(spaceIds).not.to.contain(otherSpaceId);
      expect(JSON.stringify(body)).not.to.contain(spaceBAgent);
      expect(JSON.stringify(body)).not.to.contain(otherSpaceId);
      expect(JSON.stringify(body)).to.contain(spaceAAgent);

      // The aggregation is space-scoped too, so its counts match the space-scoped
      // hits: the top-level-stamped default response plus the action_data one.
      expect(aggregations?.totalResponded).to.eql(2);
    });

    // Proves the fallback works against real Elasticsearch rather than only in DSL
    // shape: the field has to be queryable as a term for the results to come back.
    it('returns responses whose space survived only in action_data', async () => {
      const body = await fetchActionResults();

      expect(JSON.stringify(body)).to.contain(actionDataDefaultAgent);
    });

    // The default space also matches documents with no space_id at all. A response
    // carrying action_data.space_id is not unstamped, so that allowance must not
    // pull named-space results into the default space.
    it('does not leak named-space responses stamped only in action_data', async () => {
      const body = await fetchActionResults();

      expect(JSON.stringify(body)).not.to.contain(actionDataOtherSpaceAgent);
    });

    // The regression this PR fixes: read from the named space itself. A named space
    // has no missing-field allowance, so the action_data term is the only clause
    // that can return this response — unlike the default-space assertions above,
    // this one cannot pass with the fallback disabled.
    it('returns action_data-stamped responses when read from their own named space', async () => {
      const { edges, aggregations } = await fetchActionResults(otherSpaceId);
      const serialized = JSON.stringify(edges);

      expect(serialized).to.contain(actionDataOtherSpaceAgent);
      // The top-level-stamped response for this space is returned too.
      expect(serialized).to.contain(spaceBAgent);
      // Default-space responses stay out, on either field.
      expect(serialized).not.to.contain(spaceAAgent);
      expect(serialized).not.to.contain(actionDataDefaultAgent);

      expect(aggregations?.totalResponded).to.eql(2);
    });
  });
}
