/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Filter<FilterValue = unknown> {
  type: string;
  column: string;
  value: FilterValue;
  filterGroup: string;
}

export interface FiltersGroup {
  name: string;
  filters: Filter[];
}
