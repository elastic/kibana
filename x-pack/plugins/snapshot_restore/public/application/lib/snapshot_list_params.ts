/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Direction, Query } from '@elastic/eui';

export type SortField =
  | 'snapshot'
  | 'repository'
  | 'indices'
  | 'startTimeInMillis'
  | 'durationInMillis'
  | 'shards.total'
  | 'shards.failed';

export type SortDirection = Direction;

interface SnapshotTableParams {
  sortField: SortField;
  sortDirection: SortDirection;
  pageIndex: number;
  pageSize: number;
}
interface SnapshotSearchParams {
  searchField?: string;
  searchValue?: string;
  searchMatch?: string;
  searchOperator?: string;
}
export type SnapshotListParams = SnapshotTableParams & SnapshotSearchParams;

// By default, we'll display the most recent snapshots at the top of the table (no query).
export const DEFAULT_SNAPSHOT_LIST_PARAMS: SnapshotListParams = {
  sortField: 'startTimeInMillis',
  sortDirection: 'desc',
  pageIndex: 0,
  pageSize: 20,
};

const resetSearchOptions = (listParams: SnapshotListParams): SnapshotListParams => ({
  ...listParams,
  searchField: undefined,
  searchValue: undefined,
  searchMatch: undefined,
  searchOperator: undefined,
});

// to init the query for repository and policyName search passed via url
export const getQueryFromListParams = (listParams: SnapshotListParams): Query => {
  const { searchField, searchValue } = listParams;
  if (!searchField || !searchValue) {
    return Query.MATCH_ALL;
  }
  return Query.parse(`${searchField}=${searchValue}`);
};

export const getListParams = (listParams: SnapshotListParams, query: Query): SnapshotListParams => {
  if (!query) {
    return resetSearchOptions(listParams);
  }
  const clause = query.ast.clauses[0];
  if (!clause) {
    return resetSearchOptions(listParams);
  }
  // term queries (free word search) converts to snapshot name search
  if (clause.type === 'term') {
    return {
      ...listParams,
      searchField: 'snapshot',
      searchValue: String(clause.value),
      searchMatch: clause.match,
      searchOperator: 'eq',
    };
  }
  if (clause.type === 'field') {
    return {
      ...listParams,
      searchField: clause.field,
      searchValue: String(clause.value),
      searchMatch: clause.match,
      searchOperator: clause.operator,
    };
  }
  return resetSearchOptions(listParams);
};
