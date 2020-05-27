/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogEntriesRequest, LogEntriesResponse } from '../http_api/log_entries';

export const LOG_ENTRIES_SEARCH_STRATEGY = 'LOG_ENTRIES_SEARCH_STRATEGY';

declare module '../../../../../src/plugins/data/server' {
  export interface IRequestTypesMap {
    [LOG_ENTRIES_SEARCH_STRATEGY]: LogEntriesRequest;
  }

  export interface IResponseTypesMap {
    [LOG_ENTRIES_SEARCH_STRATEGY]: LogEntriesResponse;
  }
}
