/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TraceSearchState } from '../../../common/trace_explorer/trace_data_search_state';
import { TraceDataSearchSavedObjectType } from '../../saved_objects/apm_trace_data_search';
import { getTraceSearchTaskId } from './get_task_id';

export function formatTraceDataForSavedObject(
  traceSearchState: TraceSearchState
): TraceDataSearchSavedObjectType {
  return {
    taskId: getTraceSearchTaskId(traceSearchState.params),
    search: JSON.stringify(traceSearchState),
  };
}
