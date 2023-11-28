/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient, Logger, SavedObjectsClientContract } from '@kbn/core/server';
import {
  ConcreteTaskInstance,
  TaskManagerSetupContract,
  TaskManagerStartContract,
} from '@kbn/task-manager-plugin/server';
import { SortResults } from '@elastic/elasticsearch/lib/api/types';
import { ALL_SPACES_ID } from '@kbn/spaces-plugin/common/constants';
import { SLO_SUMMARY_DESTINATION_INDEX_PATTERN } from '../../../assets/constants';
import { StoredSLO } from '../../../domain/models';
import { SO_SLO_TYPE } from '../../../saved_objects';

export const TASK_TYPE = 'SLO:SUMMARIES-CLEANUP-TASK';

function findMissingItems(soIds: string[], sloSummaryIds: string[]) {
  const missingSummaryIds = sloSummaryIds.filter((item) => !soIds.includes(item));
  const missingSOIds = soIds.filter((item) => !sloSummaryIds.includes(item));

  return {
    missingSummaryIds,
    missingSOIds,
  };
}

const SEPARATOR = '__V__';

export const getDeleteQueryFilter = (sloSummaryIdsToDelete: string[]) => {
  return sloSummaryIdsToDelete.map((id) => {
    const [sloId, revision] = id.split(SEPARATOR);
    return {
      bool: {
        must: [
          {
            term: {
              'slo.id': sloId,
            },
          },
          {
            term: {
              'slo.revision': Number(revision),
            },
          },
        ],
      },
    };
  });
};

export class SloSummaryCleanupTask {
  private abortController = new AbortController();
  private logger: Logger;
  private taskManager?: TaskManagerStartContract;
  private soClient?: SavedObjectsClientContract;
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
      const finder = this.soClient.createPointInTimeFinder<Pick<StoredSLO, 'id' | 'revision'>>({
        type: SO_SLO_TYPE,
        perPage: 1000,
        fields: ['id', 'revision'],
        namespaces: [ALL_SPACES_ID],
      });
      let searchAfterKey: SortResults | undefined;
      let soIdsToCheck: string[] = [];
      let sloSummaryIdsToDelete: string[] = [];

      const processSloSummaries = async () => {
        const { sloSummaryIds, searchAfter } = await this.fetchSloSummariesIds(searchAfterKey);
        searchAfterKey = searchAfter;

        const { missingSummaryIds } = findMissingItems(
          soIdsToCheck,
          sloSummaryIds.concat(sloSummaryIdsToDelete)
        );

        sloSummaryIdsToDelete = missingSummaryIds;
      };

      for await (const response of finder.find()) {
        const soItems = response.saved_objects.map(
          (so) => `${so.attributes.id}${SEPARATOR}${so.attributes.revision}`
        );

        soIdsToCheck = soIdsToCheck.concat(soItems);

        await processSloSummaries();

        if (searchAfterKey === undefined) {
          break;
        }
      }

      await finder.close();

      // If there are no SLOs in the SO index, we can delete all the SLO Summaries
      if (soIdsToCheck.length === 0) {
        await processSloSummaries();
      }

      // Fetch the remaining SLO Summaries
      while (searchAfterKey) {
        await processSloSummaries();
      }

      if (sloSummaryIdsToDelete.length > 0) {
        this.logger.info(
          `[SLO] Deleting ${sloSummaryIdsToDelete.length} SLO Summaries from the summary index`
        );

        await this.esClient.deleteByQuery({
          index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
          query: {
            bool: {
              should: getDeleteQueryFilter(sloSummaryIdsToDelete.sort()),
            },
          },
        });
      }
    }

    return { state: { lastRunAt: runAt } };
  };

  fetchSloSummariesIds = async (searchAfter?: SortResults) => {
    this.logger.info(`[SLO] Fetching SLO Summaries ids after ${searchAfter}`);
    if (!this.esClient) {
      return {
        searchAfter: undefined,
        sloSummaryIds: [] as string[],
      };
    }

    const result = await this.esClient.search({
      size: 2000,
      index: SLO_SUMMARY_DESTINATION_INDEX_PATTERN,
      fields: ['slo.id', 'slo.revision'],
      _source: false,
      sort: [
        {
          'slo.id': {
            order: 'desc',
          },
          'slo.revision': {
            order: 'desc',
          },
          'slo.instanceId': {
            order: 'desc',
          },
        },
      ],
      search_after: searchAfter,
    });

    if ((result.hits?.hits ?? []).length === 0) {
      return {
        searchAfter: undefined,
        sloSummaryIds: [] as string[],
      };
    }

    const newSearchAfter = result.hits.hits[result.hits.hits.length - 1]?.sort;
    return {
      searchAfter: newSearchAfter,
      sloSummaryIds: result.hits.hits.map(
        ({ fields }) =>
          `${fields?.['slo.id'][0]}${SEPARATOR}${fields?.['slo.revision'][0]}` as string
      ),
    };
  };

  private get taskId() {
    return `${TASK_TYPE}:1.0.0`;
  }

  public async start(
    taskManager: TaskManagerStartContract,
    soClient: SavedObjectsClientContract,
    esClient: ElasticsearchClient
  ) {
    this.taskManager = taskManager;
    this.soClient = soClient;
    this.esClient = esClient;

    if (!taskManager) {
      this.logger.info('[SLO] Missing required service during startup, skipping task.');
    }

    this.taskManager.removeIfExists(this.taskId);

    this.taskManager.ensureScheduled({
      id: this.taskId,
      taskType: TASK_TYPE,
      schedule: {
        interval: '1h',
      },
      scope: ['observability', 'slo'],
      state: {},
      params: {},
    });
  }
}
