/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { estypes } from '@elastic/elasticsearch';
import { taskMappings as TaskManagerMapping } from '@kbn/task-manager-plugin/server/saved_objects/mappings';
import type { FtrProviderContext } from '../../ftr_provider_context';
import { scheduleTask } from './test_utils';

const { properties: taskManagerIndexMapping } = TaskManagerMapping;

interface EsLimitResult {
  taskId: string;
  taskType: string;
  category: 'search' | 'write';
  totalRequests: number;
  succeeded: number;
  rejected: number;
  limitRejected: number;
}

export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const retry = getService('retry');
  const supertest = getService('supertest');
  const testHistoryIndex = '.kibana_task_manager_test_result';

  // Budgets configured in the FTR config for a single-node cluster
  // (xpack.task_manager.es_request_limits.{search,write}.cluster_wide = 2).
  const CATEGORY_NODE_CEILING = 2;

  async function getResult(taskId: string): Promise<EsLimitResult> {
    const response = await es.search<EsLimitResult>({
      index: testHistoryIndex,
      query: {
        bool: {
          filter: [{ term: { type: 'es-limit-result' } }, { term: { taskId } }],
        },
      },
    });
    const hit = response.hits.hits[0];
    expect(hit).to.be.ok();
    return hit._source as EsLimitResult;
  }

  describe('es request limits', () => {
    beforeEach(async () => {
      const exists = await es.indices.exists({ index: testHistoryIndex });
      if (exists) {
        await es.deleteByQuery({
          index: testHistoryIndex,
          refresh: true,
          query: { match_all: {} },
        });
      } else {
        await es.indices.create({
          index: testHistoryIndex,
          mappings: {
            properties: {
              type: { type: 'keyword' },
              taskId: { type: 'keyword' },
              taskType: { type: 'keyword' },
              category: { type: 'keyword' },
              totalRequests: { type: 'long' },
              succeeded: { type: 'long' },
              rejected: { type: 'long' },
              limitRejected: { type: 'long' },
              params: taskManagerIndexMapping.params,
              state: taskManagerIndexMapping.state,
              runAt: taskManagerIndexMapping.runAt,
            } as Record<string, estypes.MappingProperty>,
          },
        });
      }
    });

    afterEach(async () => {
      await supertest.delete('/api/sample_tasks').set('kbn-xsrf', 'xxx').expect(200);
    });

    it('rejects concurrent search requests over the category budget', async () => {
      const task = await scheduleTask(supertest, {
        taskType: 'sampleTaskUsingLimitedEsClient',
        params: { category: 'search', totalRequests: 5 },
      });

      await retry.try(async () => {
        const result = await getResult(task.id);
        expect(result.totalRequests).to.eql(5);
        expect(result.succeeded).to.eql(CATEGORY_NODE_CEILING);
        expect(result.rejected).to.eql(5 - CATEGORY_NODE_CEILING);
        // every rejection must be the limiter's 429-shaped error
        expect(result.limitRejected).to.eql(result.rejected);
      });
    });

    it('rejects concurrent write requests over the category budget', async () => {
      const task = await scheduleTask(supertest, {
        taskType: 'sampleTaskUsingLimitedEsClient',
        params: { category: 'write', totalRequests: 5 },
      });

      await retry.try(async () => {
        const result = await getResult(task.id);
        expect(result.totalRequests).to.eql(5);
        expect(result.succeeded).to.eql(CATEGORY_NODE_CEILING);
        expect(result.rejected).to.eql(5 - CATEGORY_NODE_CEILING);
        expect(result.limitRejected).to.eql(result.rejected);
      });
    });

    it('allows concurrent requests within the category budget', async () => {
      const task = await scheduleTask(supertest, {
        taskType: 'sampleTaskUsingLimitedEsClient',
        params: { category: 'search', totalRequests: CATEGORY_NODE_CEILING },
      });

      await retry.try(async () => {
        const result = await getResult(task.id);
        expect(result.totalRequests).to.eql(CATEGORY_NODE_CEILING);
        expect(result.succeeded).to.eql(CATEGORY_NODE_CEILING);
        expect(result.rejected).to.eql(0);
        expect(result.limitRejected).to.eql(0);
      });
    });

    it('enforces a per-scope sub-limit below the category budget', async () => {
      // The scope declares a search sub-limit of 1, stricter than the category
      // ceiling of 2, so only a single concurrent search should succeed.
      const task = await scheduleTask(supertest, {
        taskType: 'sampleTaskWithScopedEsRequestLimit',
        params: { totalRequests: 3 },
      });

      await retry.try(async () => {
        const result = await getResult(task.id);
        expect(result.totalRequests).to.eql(3);
        expect(result.succeeded).to.eql(1);
        expect(result.rejected).to.eql(2);
        expect(result.limitRejected).to.eql(2);
      });
    });
  });
}
