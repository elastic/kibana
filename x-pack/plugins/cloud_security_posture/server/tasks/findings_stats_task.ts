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
import { FindingsStatsTaskResult, TaskHealthStatus, ScoreByPolicyTemplateBucket } from './types';
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
    logger.info(`Registered task successfully [Task: ${CSPM_FINDINGS_STATS_TASK_TYPE}]`);
  } catch (errMsg) {
    const error = transformError(errMsg);
    logger.error(
      `Task registration failed [Task: ${CSPM_FINDINGS_STATS_TASK_TYPE}] ${error.message}`
    );
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

const getScoreQuery = (): SearchRequest => ({
  index: LATEST_FINDINGS_INDEX_DEFAULT_NS,
  size: 0,
  query: {
    match_all: {},
  },
  aggs: {
    score_by_policy_template: {
      terms: {
        // TODO: CIS AWS - replace with policy_template when available
        field: 'rule.benchmark.id',
      },
      aggs: {
        total_findings: {
          value_count: {
            field: 'result.evaluation',
          },
        },
        passed_findings: {
          filter: {
            term: {
              'result.evaluation': 'passed',
            },
          },
        },
        failed_findings: {
          filter: {
            term: {
              'result.evaluation': 'failed',
            },
          },
        },
        score_by_cluster_id: {
          terms: {
            field: 'cluster_id',
          },
          aggregations: {
            total_findings: {
              value_count: {
                field: 'result.evaluation',
              },
            },
            passed_findings: {
              filter: {
                term: {
                  'result.evaluation': 'passed',
                },
              },
            },
            failed_findings: {
              filter: {
                term: {
                  'result.evaluation': 'failed',
                },
              },
            },
          },
        },
      },
    },
  },
});

export const aggregateLatestFindings = async (
  esClient: ElasticsearchClient,
  stateRuns: number,
  logger: Logger
): Promise<TaskHealthStatus> => {
  try {
    const startAggTime = performance.now();
    const scoreIndexQueryResult = await esClient.search<unknown, ScoreByPolicyTemplateBucket>(
      getScoreQuery()
    );

    if (!scoreIndexQueryResult.aggregations) {
      logger.warn(`No data found in latest findings index`);
      return 'warning';
    }

    const totalAggregationTime = performance.now() - startAggTime;
    logger.debug(
      `Executed aggregation query [Task: ${CSPM_FINDINGS_STATS_TASK_TYPE}] [Duration: ${Number(
        totalAggregationTime
      ).toFixed(2)}ms]`
    );

    // getting score per policy template buckets
    const scoresByPolicyTemplatesBuckets =
      scoreIndexQueryResult.aggregations.score_by_policy_template.buckets;

    // iterating over the buckets and return promises which will index a modified document into the scores index
    const docIndexingPromises = scoresByPolicyTemplatesBuckets.map((policyTemplateTrend) => {
      // creating score per cluster id objects
      const clustersStats = Object.fromEntries(
        policyTemplateTrend.score_by_cluster_id.buckets.map((clusterStats) => {
          const clusterId = clusterStats.key;

          return [
            clusterId,
            {
              total_findings: clusterStats.total_findings.value,
              passed_findings: clusterStats.passed_findings.doc_count,
              failed_findings: clusterStats.failed_findings.doc_count,
            },
          ];
        })
      );

      // each document contains the policy template and its scores
      return esClient.index({
        index: BENCHMARK_SCORE_INDEX_DEFAULT_NS,
        document: {
          policy_template: policyTemplateTrend.key,
          passed_findings: policyTemplateTrend.passed_findings.doc_count,
          failed_findings: policyTemplateTrend.failed_findings.doc_count,
          total_findings: policyTemplateTrend.total_findings.value,
          score_by_cluster_id: clustersStats,
        },
      });
    });

    const startIndexTime = performance.now();

    // executing indexing commands
    await Promise.all(docIndexingPromises);

    const totalIndexTime = Number(performance.now() - startIndexTime).toFixed(2);
    logger.debug(
      `Finished saving results [Task: ${CSPM_FINDINGS_STATS_TASK_TYPE}] [Duration: ${totalIndexTime}ms]`
    );

    const totalTaskTime = Number(performance.now() - startAggTime).toFixed(2);
    logger.debug(
      `Finished run ended [Task: ${CSPM_FINDINGS_STATS_TASK_TYPE}] [Duration: ${totalTaskTime}ms]`
    );

    return 'ok';
  } catch (errMsg) {
    const error = transformError(errMsg);
    logger.error(
      `Failure during task run [Task: ${CSPM_FINDINGS_STATS_TASK_TYPE}] ${error.message}`
    );
    logger.error(errMsg);
    return 'error';
  }
};
