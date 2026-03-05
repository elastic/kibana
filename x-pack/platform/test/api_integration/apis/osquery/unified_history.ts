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
  const internalApiVersion = '1';

  const responsesIndex = 'logs-osquery_manager.action.responses-default';
  const actionsIndex = '.logs-osquery_manager.actions-default';

  const componentTemplateName = 'test-osquery-responses-mappings';
  const indexTemplateName = 'test-osquery-responses';

  /**
   * Ensure the responses data stream has correct field mappings by installing
   * a component template + index template before the first document is indexed.
   * The `logs` built-in template forces data streams, so we can't use
   * es.indices.create — we need a matching index template with higher priority.
   */
  const ensureResponsesTemplate = async () => {
    await es.cluster.putComponentTemplate({
      name: componentTemplateName,
      template: {
        mappings: {
          properties: {
            schedule_id: { type: 'keyword' },
            schedule_execution_count: { type: 'integer' },
            agent_id: { type: 'keyword' },
            error: { type: 'keyword' },
            action_response: {
              properties: {
                osquery: {
                  properties: {
                    count: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    });

    await es.indices.putIndexTemplate({
      name: indexTemplateName,
      index_patterns: ['logs-osquery_manager.action.responses-*'],
      data_stream: {},
      composed_of: [componentTemplateName],
      priority: 500, // higher than the built-in `logs` template (200)
    });
  };

  /**
   * Index a scheduled response document — the kind osquerybeat writes when a
   * scheduled pack query runs on an agent.
   */
  const indexScheduledResponse = async ({
    scheduleId,
    executionCount,
    agentId,
    timestamp,
    hasError,
  }: {
    scheduleId: string;
    executionCount: number;
    agentId: string;
    timestamp: string;
    hasError?: boolean;
  }) => {
    const doc: Record<string, unknown> = {
      '@timestamp': timestamp,
      schedule_id: scheduleId,
      schedule_execution_count: executionCount,
      agent_id: agentId,
      action_response: { osquery: { count: 5 } },
    };

    if (hasError) {
      doc.error = 'query failed';
    }

    await es.index({
      index: responsesIndex,
      refresh: 'wait_for',
      document: doc,
    });
  };

  /**
   * Index a live action document — the kind Kibana writes when a user runs a
   * live query.
   */
  const indexLiveAction = async ({
    actionId,
    timestamp,
    spaceId,
  }: {
    actionId: string;
    timestamp: string;
    spaceId?: string;
  }) => {
    await es.index({
      index: actionsIndex,
      id: actionId,
      refresh: 'wait_for',
      document: {
        action_id: actionId,
        '@timestamp': timestamp,
        type: 'INPUT_ACTION',
        input_type: 'osquery',
        expiration: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        agents: ['agent-1'],
        user_id: 'elastic',
        space_id: spaceId ?? 'default',
        queries: [
          {
            action_id: `${actionId}-q`,
            id: 'query-1',
            query: 'select 1;',
            agents: ['agent-1'],
          },
        ],
      },
    });
  };

  /**
   * Seed the data stream by indexing and immediately deleting a dummy document.
   * This ensures the data stream exists before any test runs.
   */
  const seedDataStream = async () => {
    await es.index({
      index: responsesIndex,
      refresh: 'wait_for',
      document: {
        '@timestamp': new Date().toISOString(),
        schedule_id: '__seed__',
        schedule_execution_count: 0,
        agent_id: '__seed__',
      },
    });
    await es.deleteByQuery({
      index: responsesIndex,
      refresh: true,
      query: { term: { schedule_id: '__seed__' } },
    });
  };

  const cleanup = async () => {
    await es
      .deleteByQuery({
        index: responsesIndex,
        allow_no_indices: true,
        ignore_unavailable: true,
        refresh: true,
        query: { match_all: {} },
      })
      .catch(() => {});

    await es
      .deleteByQuery({
        index: actionsIndex,
        allow_no_indices: true,
        ignore_unavailable: true,
        refresh: true,
        query: { match_all: {} },
      })
      .catch(() => {});
  };

  const deleteDataStreamAndTemplates = async () => {
    await es.indices.deleteDataStream({ name: responsesIndex }).catch(() => {});
    await es.indices.deleteIndexTemplate({ name: indexTemplateName }).catch(() => {});
    await es.cluster.deleteComponentTemplate({ name: componentTemplateName }).catch(() => {});
  };

  describe('Unified history', () => {
    before(async () => {
      await deleteDataStreamAndTemplates();
      await ensureResponsesTemplate();
      await seedDataStream();
      await cleanup();
    });

    afterEach(cleanup);

    after(deleteDataStreamAndTemplates);

    describe('scheduled execution pagination — timestamp collision', () => {
      /**
       * This is the core integration test for the offset-based pagination fix.
       *
       * When many scheduled queries fire at the exact same timestamp, the
       * multi_terms aggregation returns all of them (up to size=1000).
       * The offset-based cursor then pages through them without losing rows.
       */
      it('returns all scheduled executions when many share the same timestamp', async () => {
        const SAME_TIMESTAMP = '2024-06-15T08:00:00.000Z';
        const TOTAL_QUERIES = 30;
        const PAGE_SIZE = 20;

        // Index 30 different scheduled query executions at the same timestamp,
        // each from a different schedule_id (simulating 30 pack queries firing together)
        const indexPromises = Array.from({ length: TOTAL_QUERIES }, (_, i) =>
          indexScheduledResponse({
            scheduleId: `schedule-collision-${i}`,
            executionCount: 1,
            agentId: `agent-${i % 5}`,
            timestamp: SAME_TIMESTAMP,
          })
        );
        await Promise.all(indexPromises);

        // First page — should get PAGE_SIZE rows and hasMore=true
        const page1 = await supertest
          .get('/internal/osquery/history')
          .query({ pageSize: PAGE_SIZE })
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', internalApiVersion);

        expect(page1.status).to.be(200);
        expect(page1.body.rows.length).to.be(PAGE_SIZE);
        expect(page1.body.hasMore).to.be(true);

        // All rows should be scheduled type
        for (const row of page1.body.rows) {
          expect(row.rowType).to.be('scheduled');
          expect(row.source).to.be('Scheduled');
        }

        // The response should include the offset for the next page
        expect(page1.body.nextScheduledOffset).to.be(PAGE_SIZE);

        // Second page — use cursor AND offset from page 1
        const page2 = await supertest
          .get('/internal/osquery/history')
          .query({
            pageSize: PAGE_SIZE,
            scheduledCursor: page1.body.nextScheduledCursor,
            scheduledOffset: page1.body.nextScheduledOffset,
          })
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', internalApiVersion);

        expect(page2.status).to.be(200);

        // We should get the remaining 10 rows
        expect(page2.body.rows.length).to.be(TOTAL_QUERIES - PAGE_SIZE);
        expect(page2.body.hasMore).to.be(false);

        // Total across both pages = all 30 executions
        const allIds = [
          ...page1.body.rows.map((r: { id: string }) => r.id),
          ...page2.body.rows.map((r: { id: string }) => r.id),
        ];
        expect(allIds.length).to.be(TOTAL_QUERIES);

        // All IDs should be unique — no duplicates
        const uniqueIds = new Set(allIds);
        expect(uniqueIds.size).to.be(TOTAL_QUERIES);
      });
    });

    describe('basic unified history', () => {
      it('returns an empty response when no data exists', async () => {
        const response = await supertest
          .get('/internal/osquery/history')
          .query({ pageSize: 20 })
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', internalApiVersion);

        expect(response.status).to.be(200);
        expect(response.body.rows).to.be.an('array');
        expect(response.body.rows.length).to.be(0);
        expect(response.body.hasMore).to.be(false);
      });

      // NOTE: A merge test (live + scheduled rows interleaved) is omitted here because
      // the FTR test agent's osquery integration does not include scheduled response
      // field mappings (schedule_id, schedule_execution_count). The merge logic is
      // covered by unit tests in get_unified_history_route.test.ts.

      it('filters by source type when sourceFilters is specified', async () => {
        await Promise.all([
          indexLiveAction({
            actionId: 'filter-live-1',
            timestamp: '2024-06-15T10:00:00.000Z',
          }),
          indexScheduledResponse({
            scheduleId: 'filter-sched-1',
            executionCount: 1,
            agentId: 'agent-1',
            timestamp: '2024-06-15T09:00:00.000Z',
          }),
        ]);

        // Request only scheduled
        const scheduledOnly = await supertest
          .get('/internal/osquery/history')
          .query({ pageSize: 20, sourceFilters: 'scheduled' })
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', internalApiVersion);

        expect(scheduledOnly.status).to.be(200);
        for (const row of scheduledOnly.body.rows) {
          expect(row.rowType).to.be('scheduled');
        }

        // Request only live
        const liveOnly = await supertest
          .get('/internal/osquery/history')
          .query({ pageSize: 20, sourceFilters: 'live' })
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', internalApiVersion);

        expect(liveOnly.status).to.be(200);
        for (const row of liveOnly.body.rows) {
          expect(row.rowType).to.be('live');
        }
      });

      it('aggregates agent count and success/error counts for scheduled executions', async () => {
        const scheduleId = 'stats-test';
        const timestamp = '2024-06-15T10:00:00.000Z';

        // 3 agents report success, 1 reports error
        await Promise.all([
          indexScheduledResponse({
            scheduleId,
            executionCount: 1,
            agentId: 'agent-a',
            timestamp,
          }),
          indexScheduledResponse({
            scheduleId,
            executionCount: 1,
            agentId: 'agent-b',
            timestamp,
          }),
          indexScheduledResponse({
            scheduleId,
            executionCount: 1,
            agentId: 'agent-c',
            timestamp,
          }),
          indexScheduledResponse({
            scheduleId,
            executionCount: 1,
            agentId: 'agent-d',
            timestamp,
            hasError: true,
          }),
        ]);

        const response = await supertest
          .get('/internal/osquery/history')
          .query({ pageSize: 20 })
          .set('kbn-xsrf', 'true')
          .set('elastic-api-version', internalApiVersion);

        expect(response.status).to.be(200);

        const scheduledRow = response.body.rows.find(
          (r: { scheduleId: string }) => r.scheduleId === scheduleId
        );
        expect(scheduledRow).to.be.ok();
        expect(scheduledRow.agentCount).to.be(4);
        expect(scheduledRow.successCount).to.be(3);
        expect(scheduledRow.errorCount).to.be(1);
      });
    });
  });
}
