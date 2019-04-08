/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LogEntryFieldsMapping, LogEntryTime } from '../log_entry';
import { SearchResult } from '../log_search_result';
import { TimedApiResponse } from './timed_api';

interface CommonSearchResultsPostPayload {
  indices: string[];
  fields: LogEntryFieldsMapping;
  query: string;
}

export interface AdjacentSearchResultsApiPostPayload extends CommonSearchResultsPostPayload {
  target: LogEntryTime;
  before: number;
  after: number;
}

export interface AdjacentSearchResultsApiPostResponse extends TimedApiResponse {
  results: {
    before: SearchResult[];
    after: SearchResult[];
  };
}

export interface ContainedSearchResultsApiPostPayload extends CommonSearchResultsPostPayload {
  start: LogEntryTime;
  end: LogEntryTime;
}

export interface ContainedSearchResultsApiPostResponse extends TimedApiResponse {
  results: SearchResult[];
}
