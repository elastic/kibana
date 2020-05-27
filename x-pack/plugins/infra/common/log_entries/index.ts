/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export * from './search_strategy';

export {
  LogEntry,
  LogEntriesCursor,
  logEntriesRequestRT,
  logEntriesResponseRT,
} from '../http_api/log_entries';
