/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { transformError } from '@kbn/securitysolution-es-utils';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { SearchRequest } from '@kbn/data-plugin/common';
import { ElasticsearchClient } from '@kbn/core/server';
import type { Logger } from '@kbn/core/server';
import {
  AggregatedFindingsByCluster,
  ScoreBucket,
  FindingsStatsTaskResult,
  TaskHealthStatus,
} from './types';
import {
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
} from '../../common/constants';
import { scheduleTaskSafe, removeTaskSafe } from '../lib/task_manager_util';
import { CspServerPluginStartServices } from '../types';

const CSPM_FINDINGS_STATS_TASK_ID = 'cloud_security_posture-findings_stats';
const CSPM_FINDINGS_STATS_TASK_TYPE = 'cloud_security_posture-stats_task';
const CSPM_FINDINGS_STATS_INTERVAL = '5m';

export async function scheduleFindingsStatsTask(
  taskManager: TaskManagerStartContract,
  logger: Logger
) {
  await scheduleTaskSafe(
    taskManager,
    {
      id: CSPM_FINDINGS_STATS_TASK_ID,
      taskType: CSPM_FINDINGS_STATS_TASK_TYPE,
      schedule: {
        interval: CSPM_FINDINGS_STATS_INTERVAL,
      },
      state: {},
      params: {},
    },
    logger
  );
}

export async function removeFindingsStatsTask(
  taskManager: TaskManagerStartContract,
  logger: Logger
) {
  await removeTaskSafe(taskManager, CSPM_FINDINGS_STATS_TASK_ID, logger);
}

export function setupFindingsStatsTask(
  taskManager: TaskManagerSetupContract,
  coreStartServices: CspServerPluginStartServices,
  logger: Logger
) {
  try {
    taskManager.registerTaskDefinitions({
      [CSPM_FINDINGS_STATS_TASK_TYPE]: {
        title: 'Aggregate latest findings index for score calculation',
        createTaskRunner: taskRunner(coreStartServices, logger),
      },
    });
    logger.info(`Task: ${CSPM_FINDINGS_STATS_TASK_TYPE} registered successfully`);
  } catch (errMsg) {
    const error = transformError(errMsg);
    logger.error(`Failed to register task: ${CSPM_FINDINGS_STATS_TASK_TYPE}, ${error.message}`);
  }
}

export function taskRunner(coreStartServices: CspServerPluginStartServices, logger: Logger) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    return {
      async run(): Promise<FindingsStatsTaskResult> {
        try {
          logger.info(`Runs task: ${CSPM_FINDINGS_STATS_TASK_TYPE}`);
          const esClient = (await coreStartServices)[0].elasticsearch.client.asInternalUser;
          const status = await aggregateLatestFindings(esClient, state.runs, logger);

          return {
            state: {
              runs: (state.runs || 0) + 1,
              health_status: status,
            },
          };
        } catch (errMsg) {
          const error = transformError(errMsg);
          logger.warn(`Error executing alerting health check task: ${error.message}`);
          return {
            state: {
              runs: (state.runs || 0) + 1,
              health_status: 'error',
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
): Promise<TaskHealthStatus> => {
  try {
    const startAggTime = performance.now();
    const evaluationsQueryResult = await esClient.search<unknown, ScoreBucket>(getScoreQuery());

    if (!evaluationsQueryResult.aggregations) {
      logger.warn(`No data found in latest findings index`);
      return 'warning';
    }

    const totalAggregationTime = performance.now() - startAggTime;
    logger.debug(
      `Task ${CSPM_FINDINGS_STATS_TASK_TYPE}, ${Number(totalAggregationTime).toFixed(
        2
      )} milliseconds for aggregation`
    );

    const clustersStats = Object.fromEntries(
      evaluationsQueryResult.aggregations.score_by_cluster_id.buckets.map(
        (clusterStats: AggregatedFindingsByCluster) => {
          return [
            clusterStats.key,
            {
              total_findings: clusterStats.total_findings.value,
              passed_findings: clusterStats.passed_findings.doc_count,
              failed_findings: clusterStats.failed_findings.doc_count,
            },
          ];
        }
      )
    );

    const startIndexTime = performance.now();
    await esClient.index({
      index: BENCHMARK_SCORE_INDEX_DEFAULT_NS,
      document: {
        passed_findings: evaluationsQueryResult.aggregations.passed_findings.doc_count,
        failed_findings: evaluationsQueryResult.aggregations.failed_findings.doc_count,
        total_findings: evaluationsQueryResult.aggregations.total_findings.value,
        score_by_cluster_id: clustersStats,
      },
    });

    const totalIndexTime = Number(performance.now() - startIndexTime).toFixed(2);
    logger.debug(
      `Task ${CSPM_FINDINGS_STATS_TASK_TYPE}, ${totalIndexTime} milliseconds for indexing`
    );

    const totalTaskTime = Number(performance.now() - startAggTime).toFixed(2);
    logger.debug(
      `Task ${CSPM_FINDINGS_STATS_TASK_TYPE}, took ${totalTaskTime} milliseconds to run`
    );

    return 'ok';
  } catch (errMsg) {
    const error = transformError(errMsg);
    logger.error(`failed to aggregate latest findings: ${error.message}`);
    return 'error';
  }
};

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
