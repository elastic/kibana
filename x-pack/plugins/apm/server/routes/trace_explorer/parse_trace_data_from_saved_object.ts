/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TraceSearchState } from '../../../common/trace_explorer/trace_data_search_state';
import { TraceDataSearchSavedObjectType } from '../../saved_objects/apm_trace_data_search';

export function parseTraceDataFromSavedObject(
  savedObject: TraceDataSearchSavedObjectType
): TraceSearchState {
  return JSON.parse(savedObject.search);
}
