/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsClientContract } from '../../../../../../src/core/server';
import { APM_TRACE_DATA_SEARCH_SAVED_OBJECT_TYPE } from '../../../common/apm_saved_object_constants';
import { TraceDataSearchSavedObjectType } from '../../saved_objects/apm_trace_data_search';
import { parseTraceDataFromSavedObject } from './parse_trace_data_from_saved_object';

export async function getTraceSearchState({
  taskId,
  savedObjectsClient,
}: {
  taskId: string;
  savedObjectsClient: SavedObjectsClientContract;
}) {
  const savedObject =
    await savedObjectsClient.get<TraceDataSearchSavedObjectType>(
      APM_TRACE_DATA_SEARCH_SAVED_OBJECT_TYPE,
      taskId
    );

  return parseTraceDataFromSavedObject(savedObject.attributes);
}
