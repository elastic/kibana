/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

interface ScheduledHistoryRow {
  scheduleId: string;
  executionCount: number;
  sourceType: string;
  totalRows: number;
  agentCount: number;
  successCount: number;
  errorCount: number;
}

interface ScheduledResultsResponse {
  total: number;
  aggregations: {
    totalRowCount: number;
    totalResponded: number;
    successful: number;
    failed: number;
    pending: number;
  };
}

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');

  // Scheduled action responses are written by osquerybeat to the
  // osquery_manager action.responses data stream (NOT the dotted live-query
  // index). Crucially for this regression, those docs do NOT carry a
  // `space_id` field — osquerybeat only stamps space_id from a per-query
  // config field, which can be absent. See
  // https://github.com/elastic/kibana/issues/272253.
  const responsesIndex = 'logs-osquery_manager.action.responses-default';
  const indexTemplateName = 'osquery-scheduled-results-it';
  const scheduleId = `scheduled-results-it-${Date.now()}`;
  const executionCount = 11;

  // 2 successful responses + 1 errored response; none carry a `space_id`.
  const successfulResponses = 2;
  const erroredResponses = 1;
  const rowsPerSuccess = 111;
  const expectedTotalRows = rowsPerSuccess * successfulResponses; // errored response reports 0 rows
  const expectedAgents = successfulResponses + erroredResponses;

  // This index is owned by the stack's generic `logs-*-*` data stream template,
  // whose ECS dynamic mappings type strings as `keyword` and disable date
  // detection. That makes `planned_schedule_time` a keyword (breaking the
  // history `max` aggregation) and `error` a bare keyword with no `.keyword`
  // sub-field (breaking the detail endpoint's painless terms script). The real
  // osquery_manager package template maps these correctly, but the package is
  // not installed in this env — so install a higher-priority data stream
  // template with the field types the queries rely on, then (re)create the
  // data stream. This keeps the test deterministic.
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
            planned_schedule_time: { type: 'date' },
            started_at: { type: 'date' },
            completed_at: { type: 'date' },
            schedule_id: { type: 'keyword' },
            schedule_execution_count: { type: 'long' },
            response_id: { type: 'keyword' },
            pack_id: { type: 'keyword' },
            agent_id: { type: 'keyword' },
            action_input_type: { type: 'keyword' },
            space_id: { type: 'keyword' },
            count: { type: 'long' },
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
      action_input_type: 'osquery_scheduled',
      schedule_id: scheduleId,
      schedule_execution_count: executionCount,
      pack_id: 'scheduled-results-it-pack',
      planned_schedule_time: timestamp,
      started_at: timestamp,
      completed_at: timestamp,
      // NB: intentionally NO `space_id` — this is what real osquerybeat emits
      // and is the exact shape that triggered the regression.
    };

    const documents = [
      {
        ...base,
        response_id: `${scheduleId}-a`,
        agent_id: 'scheduled-results-it-agent-a',
        action_response: { osquery: { count: rowsPerSuccess } },
        count: rowsPerSuccess,
      },
      {
        ...base,
        response_id: `${scheduleId}-b`,
        agent_id: 'scheduled-results-it-agent-b',
        action_response: { osquery: { count: rowsPerSuccess } },
        count: rowsPerSuccess,
      },
      {
        ...base,
        response_id: `${scheduleId}-c`,
        agent_id: 'scheduled-results-it-agent-c',
        action_response: { osquery: { count: 0 } },
        count: 0,
        error: 'Query execution failed',
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

  describe('Scheduled query results detail', () => {
    before(async () => {
      await recreateResponsesIndex();
      await seedResponses();
    });
    after(deleteResponses);

    // Regression guard for https://github.com/elastic/kibana/issues/272253.
    // The history aggregation and the scheduled_results detail endpoint read
    // the same action_responses docs and must report the same counts even when
    // those docs have no `space_id`. Before the fix, the detail endpoint's
    // strict `space_id` term dropped every doc and returned 0 while the
    // history row still showed the real counts.
    it('history row counts scheduled responses that have no space_id', async () => {
      const { body } = await supertest
        .get('/api/osquery/history?sourceFilters=scheduled&pageSize=100')
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .expect(200);

      const rows = body.data as ScheduledHistoryRow[];
      const row = rows.find(
        (candidate) =>
          candidate.scheduleId === scheduleId && candidate.executionCount === executionCount
      );

      expect(row).to.be.ok();
      expect(row?.sourceType).to.be('scheduled');
      expect(row?.totalRows).to.be(expectedTotalRows);
      expect(row?.agentCount).to.be(expectedAgents);
      expect(row?.successCount).to.be(successfulResponses);
      expect(row?.errorCount).to.be(erroredResponses);
    });

    it('detail endpoint agrees with the history row for responses with no space_id', async () => {
      const { body } = await supertest
        .get(`/api/osquery/scheduled_results/${scheduleId}/${executionCount}`)
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', '2023-10-31')
        .expect(200);

      const { total, aggregations } = body as ScheduledResultsResponse;

      // Pre-fix every one of these was 0 because of the strict space_id filter.
      expect(aggregations.totalRowCount).to.be(expectedTotalRows);
      expect(total).to.be(expectedAgents);
      expect(aggregations.successful).to.be(successfulResponses);
      expect(aggregations.failed).to.be(erroredResponses);
    });
  });
}
