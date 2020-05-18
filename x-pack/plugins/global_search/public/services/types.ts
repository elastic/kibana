/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { GlobalSearchResult } from '../../common/types';

/**
 * Representation of a result returned by the {@link GlobalSearchPluginStart.find | `find` API}
 */
export type NavigableGlobalSearchResult = GlobalSearchResult & {
  /**
   * Navigate to this result's associated url. If the result belongs to this Kibana instance, user will be redirected to it
   * in a SPA friendly way using `application.navigateToApp`, else a full page refresh will be performed.
   */
  navigate: () => Promise<void>;
};
/**
 * Options for the server-side {@link GlobalSearchPluginStart.find | find API}
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
 * Response returned from the server-side {@link GlobalSearchPluginStart.find | find API}
 */
export interface GlobalSearchBatchedResults {
  /**
   * Results for this batch
   */
  results: NavigableGlobalSearchResult[];
}
