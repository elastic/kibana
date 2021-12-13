/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import {
  KibanaRequest,
  SavedObjectsClientContract,
} from '../../../../../../src/core/server';
import { SecurityPluginStart } from '../../../../security/server';
import { TaskManagerStartContract } from '../../../../task_manager/server';
import {
  TraceSearchParams,
  TraceSearchState,
} from '../../../common/trace_explorer/trace_data_search_state';
import { createTraceSearchPersistenceObjects } from './create_trace_search_persistence_objects';
import { getTraceSearchTaskId } from './get_task_id';
import { getTraceSearchResult } from './get_trace_search_result';
import { getTraceSearchTask } from './get_trace_search_task';

const MAX_WAIT_TIME_MS = 5000;
const DEBOUNCE_TIME_MS = 2000;

export async function executeTraceSearch({
  params,
  request,
  taskManagerStart,
  securityStart,
  savedObjectsClient,
}: {
  params: TraceSearchParams;
  request: KibanaRequest;
  taskManagerStart: TaskManagerStartContract;
  securityStart: SecurityPluginStart;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<TraceSearchState> {
  const id = getTraceSearchTaskId(params);

  // eslint-disable-next-line prefer-const
  let [task, currentTraceSearchResult] = await Promise.all([
    getTraceSearchTask({ id, taskManagerStart }),
    getTraceSearchResult({ id, savedObjectsClient }),
  ]);

  if (!task && !currentTraceSearchResult) {
    const apiKey = await securityStart.authc.apiKeys.grantAsInternalUser(
      request,
      {
        name: `trace_search_${uuid.v4()}`,
        role_descriptors: {},
      }
    );

    if (!apiKey) {
      throw new Error('Could not create API key');
    }

    const persistenceObjects = await createTraceSearchPersistenceObjects({
      taskManagerStart,
      id,
      params,
      apiKey: `${Buffer.from(apiKey.id + ':' + apiKey.api_key).toString(
        'base64'
      )}`,
      savedObjectsClient,
    });

    currentTraceSearchResult = persistenceObjects.traceSearchState;
  }

  let timeoutId: NodeJS.Timeout | undefined;

  const result = await Promise.race([
    new Promise((resolve, reject) => {
      function resolveOrScheduleNext() {
        if (currentTraceSearchResult?.isRunning === false) {
          resolve(currentTraceSearchResult);
          return;
        }

        timeoutId = setTimeout(async () => {
          currentTraceSearchResult = await getTraceSearchResult({
            id,
            savedObjectsClient,
          });
          resolveOrScheduleNext();
        }, DEBOUNCE_TIME_MS);
      }

      resolveOrScheduleNext();
    }),
    new Promise((resolve) => {
      setTimeout(resolve, MAX_WAIT_TIME_MS);
    }),
  ]);

  if (timeoutId) {
    clearTimeout(timeoutId);
  }
  if (result === undefined) {
    return (await getTraceSearchResult({
      id,
      savedObjectsClient,
    }))!;
  }
  return result as TraceSearchState;
}
