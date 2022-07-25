/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsServiceSetup, SavedObjectsTypeMappingDefinition } from '@kbn/core/server';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import mappings from './mappings.json';
import { getMigrations } from './migrations';
import { TaskManagerConfig } from '../config';
import { getOldestIdleActionTask } from '../queries/oldest_idle_action_task';
import { TASK_MANAGER_INDEX } from '../constants';

export function setupSavedObjects(
  savedObjects: SavedObjectsServiceSetup,
  config: TaskManagerConfig
) {
  savedObjects.registerType({
    name: 'task',
    namespaceType: 'agnostic',
    hidden: true,
    convertToAliasScript: `ctx._id = ctx._source.type + ':' + ctx._id; ctx._source.remove("kibana")`,
    mappings: mappings.task as SavedObjectsTypeMappingDefinition,
    migrations: getMigrations(),
    indexPattern: TASK_MANAGER_INDEX,
    excludeOnUpgrade: async ({ readonlyEsClient }) => {
      const oldestNeededActionParams = await getOldestIdleActionTask(
        readonlyEsClient,
        TASK_MANAGER_INDEX
      );

      // Delete all action tasks that have failed and are no longer needed
      return {
        bool: {
          must: [
            {
              terms: {
                'task.taskType': [
                  'actions:.email',
                  'actions:.index',
                  'actions:.pagerduty',
                  'actions:.swimlane',
                  'actions:.server-log',
                  'actions:.slack',
                  'actions:.webhook',
                  'actions:.servicenow',
                  'actions:.servicenow-sir',
                  'actions:.jira',
                  'actions:.resilient',
                  'actions:.teams',
                ],
              },
            },
            {
              term: { type: 'task' },
            },
            {
              term: { 'task.status': 'failed' },
            },
            {
              range: {
                'task.runAt': {
                  // Only apply to tasks that were run before the oldest needed action
                  lt: oldestNeededActionParams,
                },
              },
            },
          ],
        },
      } as estypes.QueryDslQueryContainer;
    },
  });
}
