/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SavedObjectsClientContract,
  SavedObjectsErrorHelpers,
} from '../../../../../../src/core/server';
import { APM_TRACE_DATA_SEARCH_SAVED_OBJECT_TYPE } from '../../../common/apm_saved_object_constants';
import { TraceSearchState } from '../../../common/trace_explorer/trace_data_search_state';
import { TraceDataSearchSavedObjectType } from '../../saved_objects/apm_trace_data_search';
import { parseTraceDataFromSavedObject } from './parse_trace_data_from_saved_object';

export async function getTraceSearchResult({
  id,
  savedObjectsClient,
}: {
  id: string;
  savedObjectsClient: SavedObjectsClientContract;
}): Promise<TraceSearchState | undefined> {
  try {
    const savedObject =
      await savedObjectsClient.get<TraceDataSearchSavedObjectType>(
        APM_TRACE_DATA_SEARCH_SAVED_OBJECT_TYPE,
        id
      );

    return parseTraceDataFromSavedObject(savedObject.attributes);
  } catch (err) {
    if (SavedObjectsErrorHelpers.isNotFoundError(err)) {
      return undefined;
    }
    throw err;
  }
}
