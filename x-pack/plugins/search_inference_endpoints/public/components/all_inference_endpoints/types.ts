/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const INFERENCE_ENDPOINTS_TABLE_PER_PAGE_VALUES = [10, 25, 50, 100];

export enum SortFieldInferenceEndpoint {
  endpoint = 'endpoint',
}
export enum SortOrder {
  asc = 'asc',
  desc = 'desc',
}

export interface SortingParams {
  sortField: SortFieldInferenceEndpoint;
  sortOrder: SortOrder;
}

export interface QueryParams extends SortingParams {
  page: number;
  perPage: number;
}

export interface AlInferenceEndpointsTableState {
  queryParams: QueryParams;
}

export interface EuiBasicTableSortTypes {
  direction: SortOrder;
  field: string;
}

export interface InferenceEndpointUI {
  endpoint: string;
  provider: string;
  type: string;
}
