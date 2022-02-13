/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CoreSetup, Logger, ElasticsearchClient } from 'kibana/server';
import moment from 'moment';
import {
  RunContext,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '../../../task_manager/server';

import { getVisualizationCounts } from './visualization_counts';
import { ESSearchResponse } from '../../../../../src/core/types/elasticsearch';
import { getMultitermsCounts } from './multiterms_count';

// This task is responsible for running daily and aggregating all the Lens click event objects
// into daily rolled-up documents, which will be used in reporting click stats

const TELEMETRY_TASK_TYPE = 'lens_telemetry';

export const TASK_ID = `Lens-${TELEMETRY_TASK_TYPE}`;

export function initializeLensTelemetry(
  logger: Logger,
  core: CoreSetup,
  taskManager: TaskManagerSetupContract
) {
  registerLensTelemetryTask(logger, core, taskManager);
}

export function scheduleLensTelemetry(logger: Logger, taskManager?: TaskManagerStartContract) {
  if (taskManager) {
    scheduleTasks(logger, taskManager);
  }
}

function registerLensTelemetryTask(
  logger: Logger,
  core: CoreSetup,
  taskManager: TaskManagerSetupContract
) {
  taskManager.registerTaskDefinitions({
    [TELEMETRY_TASK_TYPE]: {
      title: 'Lens usage fetch task',
      timeout: '1m',
      createTaskRunner: telemetryTaskRunner(logger, core),
    },
  });
}

async function scheduleTasks(logger: Logger, taskManager: TaskManagerStartContract) {
  try {
    await taskManager.ensureScheduled({
      id: TASK_ID,
      taskType: TELEMETRY_TASK_TYPE,
      state: { byDate: {}, suggestionsByDate: {}, saved: {}, runs: 0 },
      params: {},
    });
  } catch (e) {
    logger.debug(`Error scheduling task, received ${e.message}`);
  }
}

export async function getDailyEvents(
  kibanaIndex: string,
  getEsClient: () => Promise<ElasticsearchClient>
): Promise<{
  byDate: Record<string, Record<string, number>>;
  suggestionsByDate: Record<string, Record<string, number>>;
}> {
  const esClient = await getEsClient();
  const aggs = {
    daily: {
      date_histogram: {
        field: 'lens-ui-telemetry.date',
        calendar_interval: '1d' as const,
        min_doc_count: 1,
      },
      aggs: {
        groups: {
          filters: {
            filters: {
              suggestionEvents: {
                bool: {
                  filter: {
                    term: { 'lens-ui-telemetry.type': 'suggestion' },
                  },
                },
              },
              regularEvents: {
                bool: {
                  must_not: {
                    term: { 'lens-ui-telemetry.type': 'suggestion' },
                  },
                },
              },
            },
          },
          aggs: {
            names: {
              terms: { field: 'lens-ui-telemetry.name', size: 100 },
              aggs: {
                sums: { sum: { field: 'lens-ui-telemetry.count' } },
              },
            },
          },
        },
      },
    },
  };

  const metrics = await esClient.search<ESSearchResponse<unknown, { body: { aggs: typeof aggs } }>>(
    {
      index: kibanaIndex,
      body: {
        query: {
          bool: {
            filter: [
              { term: { type: 'lens-ui-telemetry' } },
              { range: { 'lens-ui-telemetry.date': { gte: 'now-90d/d' } } },
            ],
          },
        },
        aggs,
      },
      size: 0,
    }
  );

  const byDateByType: Record<string, Record<string, number>> = {};
  const suggestionsByDate: Record<string, Record<string, number>> = {};

  // @ts-expect-error no way to declare aggregations for search response
  metrics.aggregations!.daily.buckets.forEach((daily) => {
    const byType: Record<string, number> = byDateByType[daily.key] || {};
    // @ts-expect-error no way to declare aggregations for search response
    daily.groups.buckets.regularEvents.names.buckets.forEach((bucket) => {
      byType[bucket.key] = (bucket.sums.value || 0) + (byType[daily.key] || 0);
    });
    byDateByType[daily.key] = byType;

    const suggestionsByType: Record<string, number> = suggestionsByDate[daily.key] || {};
    // @ts-expect-error no way to declare aggregations for search response
    daily.groups.buckets.suggestionEvents.names.buckets.forEach((bucket) => {
      suggestionsByType[bucket.key] =
        (bucket.sums.value || 0) + (suggestionsByType[daily.key] || 0);
    });
    suggestionsByDate[daily.key] = suggestionsByType;
  });

  // Always delete old date because we don't report it
  await esClient.deleteByQuery({
    index: kibanaIndex,
    wait_for_completion: true,
    body: {
      query: {
        bool: {
          filter: [
            { term: { type: 'lens-ui-telemetry' } },
            { range: { 'lens-ui-telemetry.date': { lt: 'now-90d/d' } } },
          ],
        },
      },
    },
  });

  return {
    byDate: byDateByType,
    suggestionsByDate,
  };
}

export function telemetryTaskRunner(logger: Logger, core: CoreSetup) {
  return ({ taskInstance }: RunContext) => {
    const { state } = taskInstance;
    const getEsClient = async () => {
      const [coreStart] = await core.getStartServices();
      return coreStart.elasticsearch.client.asInternalUser;
    };

    return {
      async run() {
        const kibanaIndex = core.savedObjects.getKibanaIndex();

        return Promise.all([
          getDailyEvents(kibanaIndex, getEsClient),
          getVisualizationCounts(getEsClient, kibanaIndex),
          getMultitermsCounts(getEsClient, kibanaIndex),
        ])
          .then(([lensTelemetry, lensVisualizations, lensMultiterms]) => {
            return {
              state: {
                runs: (state.runs || 0) + 1,
                byDate: (lensTelemetry && lensTelemetry.byDate) || {},
                suggestionsByDate: (lensTelemetry && lensTelemetry.suggestionsByDate) || {},
                saved: lensVisualizations,
                multiterms: lensMultiterms,
              },
              runAt: getNextMidnight(),
            };
          })
          .catch((errMsg) => logger.warn(`Error executing lens telemetry task: ${errMsg}`));
      },
      async cancel() {},
    };
  };
}

function getNextMidnight() {
  return moment().add(1, 'day').startOf('day').toDate();
}
