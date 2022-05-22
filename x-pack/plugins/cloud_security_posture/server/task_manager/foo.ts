/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// import { ElasticSearchHit } from "@kbn/discover-plugin/public/types";
import {
  AggregationsAggregationContainer,
  SearchRequest,
  AggregationsMultiBucketAggregateBase as Aggregation,
} from '@elastic/elasticsearch/lib/api/types';
import { CoreStart, ElasticsearchClient } from '@kbn/core/server';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
  //   TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import type { Logger } from '@kbn/core/server';
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { HealthStatus } from '@kbn/task-manager-plugin/server/monitoring';
import {
  LATEST_FINDINGS_INDEX_DEFAULT_NS,
  BENCHMARK_SCORE_INDEX_DEFAULT_NS,
} from '../../common/constants';
import { CspServerPluginStart, CspServerPluginStartDeps } from '../types';

const INDEX_SCORE_TASK_ID = 'index_csp_score';
export function initializeScoreTask(
  taskManager: TaskManagerSetupContract,
  coreStartServices: Promise<[CoreStart, CspServerPluginStartDeps, CspServerPluginStart]>
) {
  console.log('111111111111 ');
  registerScoreTask(taskManager, coreStartServices);
}
export function registerScoreTask(
  taskManager: TaskManagerSetupContract,
  coreStartServices: Promise<[CoreStart, CspServerPluginStartDeps, CspServerPluginStart]>
) {
  console.log('22222222222222222');
  taskManager.registerTaskDefinitions({
    [INDEX_SCORE_TASK_ID]: {
      title: 'Alerting framework health check task',
      createTaskRunner: scoreTaskTaskRunner(coreStartServices),
    },
  });
}

export function scoreTaskTaskRunner(
  coreStartServices: Promise<[CoreStart, CspServerPluginStartDeps, CspServerPluginStart]>
) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    return {
      async run() {
        try {
          console.log('333333333333');
          const esClient = (await coreStartServices)[0].elasticsearch.client.asInternalUser;
          return await indexScore(esClient, state.runs);
        } catch (errMsg) {
          //   logger.warn(`Error executing alerting health check task: ${errMsg}`);
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

const indexScore = async (esClient: ElasticsearchClient, stateRuns?: number) => {
  try {
    console.log('4444444444444');
    const evaluationsQueryResult = await esClient.search<unknown, ScoreAggResult>(getScoreQuery());
    console.log(evaluationsQueryResult.aggregations);
    await esClient.index({
      index: BENCHMARK_SCORE_INDEX_DEFAULT_NS,
      document: {
        failed_findings: evaluationsQueryResult.aggregations.failed_findings.doc_count,
        passed_findings: evaluationsQueryResult.aggregations.passed_findings.doc_count,
        total_findings: evaluationsQueryResult.aggregations.total_findings.doc_count,
        ...evaluationsQueryResult.aggregations.score_by_cluster_id.buckets,
      },
    });
    return {
      state: {
        runs: (stateRuns || 0) + 1,
        health_status: HealthStatus.OK,
      },
    };
  } catch (err) {
    console.log(err);
    return {
      state: {
        runs: (stateRuns || 0) + 1,
        health_status: HealthStatus.Error,
      },
    };
  }
};
export interface ScoreBucket {
  score_by_cluster_id: {
    doc_count_error_upper_bound: number;
    sum_other_doc_count: number;
    // buckets: [key: number,  total_findings: number;
    //     passed_findings: { doc_count: number };
    //     failed_findings: { doc_count: number }];
  };
  total_findings: number;
  passed_findings: { doc_count: number };
  failed_findings: { doc_count: number };
}
interface ScoreAggResult {
  aggs_by_cluster_id: Aggregation<ScoreBucket>;
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

const benchmarkScoreAggregation: AggregationsAggregationContainer = {
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
};

export async function scheduleIndexScoreTask(
  taskManager: TaskManagerStartContract,
  logger: Logger
) {
  try {
    // const interval = config.healthCheck.interval;
    await taskManager.ensureScheduled({
      id: INDEX_SCORE_TASK_ID,
      taskType: INDEX_SCORE_TASK_ID,
      schedule: { interval: '1m' },
      state: {},
      params: {},
    });
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}
