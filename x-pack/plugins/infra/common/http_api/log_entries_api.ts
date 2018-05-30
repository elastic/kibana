/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogEntry, LogEntryFieldsMapping, LogEntryTime } from '../log_entry';
import { TimedApiResponse } from './timed_api';

export interface AdjacentLogEntriesApiPostPayload {
  after: number;
  before: number;
  fields: LogEntryFieldsMapping;
  indices: string[];
  target: LogEntryTime;
}

export interface AdjacentLogEntriesApiPostResponse extends TimedApiResponse {
  entries: {
    after: LogEntry[];
    before: LogEntry[];
  };
}

export interface LatestLogEntriesApiPostPayload {
  count: number;
  fields: LogEntryFieldsMapping;
  indices: string[];
}

export interface LatestLogEntriesApiPostResponse extends TimedApiResponse {
  entries: LogEntry[];
}
