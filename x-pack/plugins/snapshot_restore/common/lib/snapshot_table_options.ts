/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Direction } from '@elastic/eui';

export type SortField = 'snapshot' | 'indices' | 'startTimeInMillis' | 'durationInMillis';
export type SortDirection = Direction;
export interface SnapshotTableOptions {
  sortField: SortField;
  sortDirection: SortDirection;
  pageIndex: number;
  pageSize: number;
}

// By default, we'll display the most recent snapshots at the top of the table.
export const SNAPSHOT_DEFAULT_TABLE_OPTIONS: SnapshotTableOptions = {
  sortField: 'startTimeInMillis',
  sortDirection: 'desc',
  pageIndex: 0,
  pageSize: 20,
};
const sortFieldToESParams = {
  snapshot: 'name',
  indices: 'index_count',
  startTimeInMillis: 'start_time',
  durationInMillis: 'duration',
};
export const convertSortFieldToES = (sortField: SortField): string => {
  return sortFieldToESParams[sortField];
};
