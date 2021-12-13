/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '../../../../../../src/core/server';
import { TaskManagerStartContract } from '../../../../task_manager/server';
import { APM_TRACE_DATA_SEARCH_SAVED_OBJECT_TYPE } from '../../../common/apm_saved_object_constants';
import {
  TraceSearchParams,
  TraceSearchState,
} from '../../../common/trace_explorer/trace_data_search_state';
import { APM_TRACE_SEARCH_TASK_TYPE_NAME } from '../../lib/trace_explorer/constants';
import { TraceDataSearchSavedObjectType } from '../../saved_objects/apm_trace_data_search';
import { formatTraceDataForSavedObject } from './format_trace_data_for_saved_object';

export async function createTraceSearchPersistenceObjects({
  id,
  params,
  apiKey,
  taskManagerStart,
  savedObjectsClient,
}: {
  id: string;
  params: TraceSearchParams;
  apiKey: string;
  taskManagerStart: TaskManagerStartContract;
  savedObjectsClient: SavedObjectsClientContract;
}) {
  const fragmentDefaults = {
    isPartial: false,
    isRunning: false,
    isError: false,
    error: undefined,
    data: undefined,
    pageIndex: 0,
  };

  const traceSearchState: TraceSearchState = {
    params,
    apiKey,
    isRunning: true,
    isPartial: true,
    isError: false,
    error: undefined,
    fragments: {
      distribution: {
        ...fragmentDefaults,
      },
      samples: {
        ...fragmentDefaults,
      },
      operations: {
        ...fragmentDefaults,
      },
    },
    pagination: {
      after: null,
      pageIndex: 0,
    },
  };

  await savedObjectsClient.create<TraceDataSearchSavedObjectType>(
    APM_TRACE_DATA_SEARCH_SAVED_OBJECT_TYPE,
    formatTraceDataForSavedObject(traceSearchState),
    {
      id,
    }
  );

  const task = await taskManagerStart.schedule({
    id,
    params: {
      ...params,
      apiKey,
    },
    state: {},
    taskType: APM_TRACE_SEARCH_TASK_TYPE_NAME,
  });

  return {
    task,
    traceSearchState,
  };
}
