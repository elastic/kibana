/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ISearchStart } from '../../../../../../../../src/plugins/data/public';
import { decodeOrThrow } from '../../../../../common/runtime_types';
import {
  LogEntry,
  LogEntrySearchRequestParams,
  logEntrySearchRequestParamsRT,
  logEntrySearchResponsePayloadRT,
  LOG_ENTRY_SEARCH_STRATEGY,
} from '../../../../../common/search_strategies/log_entries/log_entry';

export { LogEntry };

export const fetchLogEntry = async (
  requestArgs: LogEntrySearchRequestParams,
  search: ISearchStart
) => {
  const response = await search
    .search(
      { params: logEntrySearchRequestParamsRT.encode(requestArgs) },
      { strategy: LOG_ENTRY_SEARCH_STRATEGY }
    )
    .toPromise();

  return decodeOrThrow(logEntrySearchResponsePayloadRT)(response.rawResponse);
};
