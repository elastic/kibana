/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { FtrProviderContext } from '../../ftr_provider_context';

interface ResultEdge {
  _source?: { space_id?: string; osquery?: { result?: Record<string, unknown> } };
  fields?: Record<string, unknown>;
}

interface ScheduledResultsRows {
  data: { edges: ResultEdge[]; rawResponse?: { hits?: { hits?: ResultEdge[] } } };
}

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const osqueryPublicApiVersion = '2023-10-31';

  const probeIndex = 'logs-osquery_manager.result_cross_space_it';
  const indexTemplateName = 'osquery-results-cross-space-it';
  const scheduleId = `cross-space-it-${Date.now()}`;
  const executionCount = 7;

  const defaultSecret = 'DEFAULT_SPACE_OK';
  const foreignSecret = 'FOREIGN_SPACE_SECRET';
  const foreignSpaceId = 'cross-space-it-secret';

  const recreateProbeIndex = async () => {
    await es.indices.delete({ index: probeIndex }, { ignore: [404] });
    await es.indices.putIndexTemplate({
      name: indexTemplateName,
      // Match the probe index explicitly; higher priority than the generic
      // `logs-*-*` template so the field types the queries rely on are correct.
      index_patterns: [probeIndex],
      priority: 600,
      template: {
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            'event.ingested': { type: 'date' },
            schedule_id: { type: 'keyword' },
            space_id: { type: 'keyword' },
            elastic_agent: { properties: { id: { type: 'keyword' } } },
            agent: { properties: { id: { type: 'keyword' } } },
            osquery_meta: { properties: { schedule_execution_count: { type: 'long' } } },
            osquery: { properties: { result: { type: 'object', enabled: true } } },
          },
        },
      },
    });
    await es.indices.create({ index: probeIndex });
  };

  const seedResults = async () => {
    const timestamp = new Date().toISOString();
    const base = {
      '@timestamp': timestamp,
      'event.ingested': timestamp,
      schedule_id: scheduleId,
      osquery_meta: { schedule_execution_count: executionCount },
    };

    const documents = [
      {
        ...base,
        space_id: 'default',
        elastic_agent: { id: 'cross-space-it-agent-default' },
        agent: { id: 'cross-space-it-agent-default' },
        osquery: { result: { marker: defaultSecret } },
      },
      {
        ...base,
        space_id: foreignSpaceId,
        elastic_agent: { id: 'cross-space-it-agent-foreign' },
        agent: { id: 'cross-space-it-agent-foreign' },
        osquery: { result: { marker: foreignSecret } },
      },
    ];

    for (const document of documents) {
      await es.index({ index: probeIndex, refresh: 'wait_for', document });
    }
  };

  const deleteResults = async () => {
    await es.indices.delete({ index: probeIndex }, { ignore: [404] });
    await es.indices.deleteIndexTemplate({ name: indexTemplateName }, { ignore: [404] });
  };

  describe('Scheduled query results cross-space isolation', () => {
    before(async () => {
      await recreateProbeIndex();
      await seedResults();
    });
    after(deleteResults);

    it('results endpoint returns only the caller-space rows, never another space', async () => {
      const { body } = await supertest
        .get(
          `/api/osquery/scheduled_results/${scheduleId}/${executionCount}/results?page=0&pageSize=100`
        )
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', osqueryPublicApiVersion)
        .expect(200);

      const { data } = body as ScheduledResultsRows;
      const edges = data.edges ?? data.rawResponse?.hits?.hits ?? [];
      const spaceIds = edges.map(
        (edge) => edge._source?.space_id ?? (edge.fields?.space_id as string[] | undefined)?.[0]
      );

      // The default-space row is visible; the foreign-space row is not.
      // Pre-fix the unscoped `result*` fallback returned BOTH rows.
      expect(spaceIds).not.to.contain(foreignSpaceId);
      expect(JSON.stringify(body)).not.to.contain(foreignSecret);
      expect(JSON.stringify(body)).to.contain(defaultSecret);
    });

    it('export endpoint never streams another space rows', async () => {
      const response = await supertest
        .post(
          `/api/osquery/scheduled_results/${scheduleId}/${executionCount}/_export?format=ndjson`
        )
        .set('kbn-xsrf', 'true')
        .set('elastic-api-version', osqueryPublicApiVersion)
        .send({})
        .expect(200);

      // supertest returns the streamed body as text/buffer for file downloads.
      const exported = response.text ?? String(response.body);

      // Pre-fix the export streamed the foreign-space row (and its payload).
      expect(exported).not.to.contain(foreignSecret);
      expect(exported).not.to.contain(foreignSpaceId);
    });
  });
}
