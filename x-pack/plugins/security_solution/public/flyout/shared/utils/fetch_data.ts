/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IEsSearchRequest, IKibanaSearchResponse } from '@kbn/data-plugin/common';
import type { ISearchStart } from '@kbn/data-plugin/public';

export const FIELD_NAMES_AGG_KEY = 'fieldNames';

export const EVENT_KIND_AGG_KEY = 'eventKind';
export const HOST_NAME_AGG_KEY = 'hostName';

export const USER_NAME_AGG_KEY = 'userName';
export const HOSTS_AGG_KEY = 'hosts';
export const USERS_AGG_KEY = 'users';

export interface AggregationValue {
  doc_count: number;
  key: string;
}

/**
 * Interface for a specific aggregation schema with nested aggregations, used in the prevalence components
 */
export interface RawAggregatedDataResponse {
  aggregations: {
    [FIELD_NAMES_AGG_KEY]: {
      buckets: {
        [key: string]: {
          eventKind: { buckets: AggregationValue[] };
          hostName: { buckets: AggregationValue[] };
          userName: { buckets: AggregationValue[] };
        };
      };
    };
    [HOSTS_AGG_KEY]: {
      buckets: AggregationValue[];
    };
    [USERS_AGG_KEY]: {
      buckets: AggregationValue[];
    };
  };
}

/**
 * Interface for non-aggregated responses
 */
export interface RawResponse {
  hits: {
    total: number;
  };
}

/**
 * Reusable method that returns a promise wrapping the search functionality of Kibana search service
 */
export const createFetchData = async <TResponse, T = {}>(
  searchService: ISearchStart,
  req: IEsSearchRequest
): Promise<TResponse> => {
  return new Promise((resolve, reject) => {
    searchService.search<IEsSearchRequest, IKibanaSearchResponse<TResponse>>(req).subscribe({
      next: (response) => {
        resolve(response.rawResponse);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
};
