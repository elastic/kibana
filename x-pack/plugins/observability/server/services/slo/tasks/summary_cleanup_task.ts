/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger, SavedObjectsClient } from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { SLO_SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../assets/constants';
import { StoredSLO } from '../../../domain/models';
import { SO_SLO_TYPE } from '../../../saved_objects';

export const TASK_TYPE = 'SLO-DEFINITIONS-CLEANUP-TASK';

function findMissingItems(soIds: string[], sloDefIds: string[]) {
  const missingSloDefIds = sloDefIds.filter((item) => !soIds.includes(item));
  const missingSOIds = soIds.filter((item) => !sloDefIds.includes(item));

  return {
    missingSloDefIds,
    missingSOIds,
  };
}

export class SloSummaryCleanupTask {
  private abortController = new AbortController();
  private logger: Logger;
  private taskManager?: TaskManagerStartContract;
  private soClient?: SavedObjectsClient;
  private esClient?: ElasticsearchClient;

  constructor(taskManager: TaskManagerSetupContract, logger: Logger) {
    this.logger = logger;

    taskManager.registerTaskDefinitions({
      [TASK_TYPE]: {
        title: 'SLO Definitions Cleanup Task',
        timeout: '3m',
        maxAttempts: 1,
        createTaskRunner: ({ taskInstance }: { taskInstance: ConcreteTaskInstance }) => {
          return {
            run: async () => {
              return this.runTask();
            },

            cancel: async () => {
              this.abortController.abort('[SLO] Definitions clean up Task timed out');
            },
          };
        },
      },
    });
  }

  runTask = async () => {
    const runAt = new Date().toISOString();

    if (this.soClient && this.esClient) {
      const finder = this.soClient.createPointInTimeFinder<StoredSLO>({
        type: SO_SLO_TYPE,
        perPage: 1000,
        fields: ['id'],
      });
      let searchAfterKey: SortResults | undefined;
      const soIds: string[] = [];
      let sloDefIdsToDelete: string[] = [];

      for await (const response of finder.find()) {
        const soItems = response.saved_objects.map((so) => so.attributes.id);

        const { sloDefIds, searchAfter } = await this.fetchSloDefinitions(searchAfterKey);
        searchAfterKey = searchAfter;

        const { missingSloDefIds, missingSOIds } = findMissingItems(
          soItems.concat(soIds),
          sloDefIds.concat(sloDefIdsToDelete)
        );

        soIds.push(...missingSOIds);
        sloDefIdsToDelete = missingSloDefIds;
      }
      this.logger.info(
        JSON.stringify({
          idsToDelete: Array.from(new Set(sloDefIdsToDelete)),
          soIds: Array.from(new Set(soIds)),
        })
      );

      if (sloDefIdsToDelete.length > 0) {
        await this.esClient.deleteByQuery({
          index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
          query: {
            terms: {
              'slo.id': sloDefIdsToDelete,
            },
          },
        });
      }
    }

    return { state: { lastRunAt: runAt } };
  };

  fetchSloDefinitions = async (searchAfter?: SortResults) => {
    if (this.esClient) {
      const result = await this.esClient.search({
        size: 1000,
        index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
        fields: ['slo.id'],
        collapse: {
          field: 'slo.id',
        },
        _source: false,
        sort: [
          {
            'slo.id': {
              order: 'desc',
            },
          },
        ],
        search_after: searchAfter,
      });

      const newSearchAfter = result.hits.hits[result.hits.hits.length - 1].sort;
      return {
        searchAfter: newSearchAfter,
        sloDefIds: result.hits.hits.map((hit) => hit.fields?.['slo.id'][0] as string),
      };
    } else {
      return {
        searchAfter: undefined,
        sloDefIds: [] as string[],
      };
    }
  };

  private get taskId() {
    return `${TASK_TYPE}:1.0.0`;
  }

  public async start(
    taskManager: TaskManagerStartContract,
    soClient: SavedObjectsClient,
    esClient: ElasticsearchClient
  ) {
    this.taskManager = taskManager;
    this.soClient = soClient;
    this.esClient = esClient;

    if (!taskManager) {
      this.logger.info('[SLO] Missing required service during startup, skipping task.');
    }

    this.taskManager.ensureScheduled({
      id: this.taskId,
      taskType: TASK_TYPE,
      schedule: {
        interval: '2h',
      },
      scope: ['observability', 'slo'],
      state: {},
      params: {},
    });
  }
}
