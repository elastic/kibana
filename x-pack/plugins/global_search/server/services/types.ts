/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { GlobalSearchResult } from '../../common/types';

/**
 * Options for the server-side {@link GlobalSearchServiceStart.find | find API}
 */
export interface GlobalSearchFindOptions {
  /**
   * A custom preference token associated with a search 'session' that should be used to get consistent scoring
   * when performing calls to ES. Can also be used as a 'session' token for providers returning data from elsewhere
   * than an elasticsearch cluster.
   * If not specified, a random token will be generated and used.
   */
  preference?: string;
  /**
   * Optional observable to notify that the associated `find` call should be canceled.
   * If/when provided and emitting, the result observable will be completed and no further result emission will be performed.
   */
  aborted$?: Observable<void>;
}
/**
 * Response returned from the server-side {@link GlobalSearchServiceStart | global search service}'s `find` API
 */
export interface GlobalSearchBatchedResults {
  /**
   * Results for this batch
   */
  results: GlobalSearchResult[];
}
