/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Fields {
  filterFields: string[];
  sortFields: string[];
}

export type SortDirection = 'asc' | 'desc';

export interface SortOption {
  name: string;
  value: string;
  direction: SortDirection;
}
