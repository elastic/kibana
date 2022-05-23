/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import { CoreStart, ElasticsearchClient } from '@kbn/core/server';
import {
  RunContext,
  TaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { Logger } from '@kbn/core/server';
import { HealthStatus } from '../../common/types';
import {
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
} from '../../common/constants';
import { CspServerPluginStart, CspServerPluginStartDeps } from '../types';

export function initializeFindingsAggregationTask(
  taskManager: TaskManagerSetupContract,
  taskId: string,
  coreStartServices: Promise<[CoreStart, CspServerPluginStartDeps, CspServerPluginStart]>,
  logger: Logger
) {
  try {
    registerTask(taskManager, taskId, coreStartServices, logger);
    logger.debug(`task: ${taskId} registered successfully`);
  } catch (errMsg) {
    logger.error(`Failed to register task: ${taskId}, ${errMsg}`);
  }
}
export function registerTask(
  taskManager: TaskManagerSetupContract,
  taskId: string,
  coreStartServices: Promise<[CoreStart, CspServerPluginStartDeps, CspServerPluginStart]>,
  logger: Logger
) {
  taskManager.registerTaskDefinitions({
    [taskId]: {
      title: 'Aggregate latest findings index for score calculation',
      createTaskRunner: taskRunner(coreStartServices, logger),
    },
  });
}

export function taskRunner(
  coreStartServices: Promise<[CoreStart, CspServerPluginStartDeps, CspServerPluginStart]>,
  logger: Logger
) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    return {
      async run() {
        try {
          const esClient = (await coreStartServices)[0].elasticsearch.client.asInternalUser;
          return await aggregateLatestFindings(esClient, state.runs, logger);
        } catch (errMsg) {
          logger.warn(`Error executing alerting health check task: ${errMsg}`);
          return {
            state: {
              runs: (state.runs || 0) + 1,
              health_status: HealthStatus.Error,
            },
          };
        }
      },
    };
  };
}

const aggregateLatestFindings = async (
  esClient: ElasticsearchClient,
  stateRuns: number,
  logger: Logger
) => {
  try {
    const evaluationsQueryResult = await esClient.search<unknown, ScoreBucket>(getScoreQuery());
    if (evaluationsQueryResult.aggregations) {
      const clustersStats = evaluationsQueryResult.aggregations.score_by_cluster_id.buckets.map(
        (clusterStats: AggregatedFindingsByCluster) => {
          return {
            [clusterStats.key]: {
              failed_findings: clusterStats.failed_findings.doc_count,
              passed_findings: clusterStats.passed_findings.doc_count,
              total_findings: clusterStats.total_findings.value,
            },
          };
        }
      );

      await esClient.index({
        index: BENCHMARK_SCORE_INDEX_DEFAULT_NS,
        document: {
          failed_findings: evaluationsQueryResult.aggregations.failed_findings.doc_count,
          passed_findings: evaluationsQueryResult.aggregations.passed_findings.doc_count,
          total_findings: evaluationsQueryResult.aggregations.total_findings.doc_count,
          score_by_cluster_id: clustersStats,
        },
      });
      return {
        state: {
          runs: (stateRuns || 0) + 1,
          health_status: HealthStatus.OK,
        },
      };
    }
    logger.warn(`No data found in latest findings index`);
  } catch (errMsg) {
    logger.error(`failed to aggregate latest findings: ${errMsg}`);
    return {
      state: {
        runs: (stateRuns || 0) + 1,
        health_status: HealthStatus.Error,
      },
    };
  }
};

export interface AggregatedFindings {
  passed_findings: { doc_count: number };
  failed_findings: { doc_count: number };
}

export interface AggregatedFindingsByCluster extends AggregatedFindings {
  key: string;
  total_findings: { value: number };
}
export interface ScoreBucket extends AggregatedFindings {
  score_by_cluster_id: {
    buckets: AggregatedFindingsByCluster[];
  };
  total_findings: { doc_count: number };
}

const getScoreQuery = (): SearchRequest => ({
  index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
  size: 0,
  query: {
    match_all: {},
  },
  aggs: {
    total_findings: {
      value_count: {
        field: 'result.evaluation.keyword',
      },
    },
    passed_findings: {
      filter: {
        term: {
          'result.evaluation.keyword': 'passed',
        },
      },
    },
    failed_findings: {
      filter: {
        term: {
          'result.evaluation.keyword': 'failed',
        },
      },
    },
    score_by_cluster_id: {
      terms: {
        field: 'cluster_id.keyword',
      },
      aggregations: {
        total_findings: {
          value_count: {
            field: 'result.evaluation.keyword',
          },
        },
        passed_findings: {
          filter: {
            term: {
              'result.evaluation.keyword': 'passed',
            },
          },
        },
        failed_findings: {
          filter: {
            term: {
              'result.evaluation.keyword': 'failed',
            },
          },
        },
      },
    },
  },
});

export async function scheduleIndexScoreTask(
  taskManager: TaskManagerStartContract,
  taskConfig: TaskInstance,
  logger: Logger
) {
  try {
    await taskManager.ensureScheduled({
      id: taskConfig.id!,
      taskType: taskConfig.taskType,
      schedule: taskConfig.schedule,
      state: {},
      params: {},
    });
  } catch (errMsg) {
    logger.debug(`Error scheduling task, received ${errMsg.message}`);
  }
}
