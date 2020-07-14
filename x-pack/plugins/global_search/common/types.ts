/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { Serializable } from 'src/core/types';

/**
 * Options provided to {@link GlobalSearchResultProvider | a result provider}'s `find` method.
 */
export interface GlobalSearchProviderFindOptions {
  /**
   * A custom preference token associated with a search 'session' that should be used to get consistent scoring
   * when performing calls to ES. Can also be used as a 'session' token for providers returning data from elsewhere
   * than an elasticsearch cluster.
   */
  preference: string;
  /**
   * Observable that emits once if and when the `find` call has been aborted, either manually by the consumer,
   * or when the internal timeout period as been reached.
   *
   * When a `find` request is effectively aborted, the service will stop emitting any new result to the consumer anyway, but
   * this can (and should) be used to cancel any pending asynchronous task and complete the result observable from within the provider.
   */
  aborted$: Observable<void>;
  /**
   * The total maximum number of results (including all batches, not per emission) that should be returned by the provider for a given `find` request.
   * Any result emitted exceeding this quota will be ignored by the service and not emitted to the consumer.
   */
  maxResults: number;
}

/**
 * Structured type for the {@link GlobalSearchProviderResult.url | provider result's url property}
 */
export type GlobalSearchProviderResultUrl = string | { path: string; prependBasePath: boolean };

/**
 * Representation of a result returned by a {@link GlobalSearchResultProvider | result provider}
 */
export interface GlobalSearchProviderResult {
  /** an id that should be unique for an individual provider's results */
  id: string;
  /** the title/label of the result */
  title: string;
  /** the type of result */
  type: string;
  /** an optional EUI icon name to associate with the search result */
  icon?: string;
  /**
   * The url associated with this result.
   * This can be either an absolute url, a path relative to the basePath, or a structure specifying if the basePath should be prepended.
   *
   * @example
   * `result.url = 'https://kibana-instance:8080/base-path/app/my-app/my-result-type/id';`
   * `result.url = '/app/my-app/my-result-type/id';`
   * `result.url = { path: '/base-path/app/my-app/my-result-type/id', prependBasePath: false };`
   */
  url: GlobalSearchProviderResultUrl;
  /** the score of the result, from 1 (lowest) to 100 (highest) */
  score: number;
  /** an optional record of metadata for this result */
  meta?: Record<string, Serializable>;
}

/**
 * Representation of a result returned by the {@link GlobalSearchPluginStart.find | `find` API}
 */
export type GlobalSearchResult = Omit<GlobalSearchProviderResult, 'url'> & {
  /**
   * The url associated with this result.
   * This can be either an absolute url, or a relative path including the basePath
   */
  url: string;
};

/**
 * Response returned from the {@link GlobalSearchPluginStart | global search service}'s `find` API
 *
 * @public
 */
export interface GlobalSearchBatchedResults {
  /**
   * Results for this batch
   */
  results: GlobalSearchResult[];
}
