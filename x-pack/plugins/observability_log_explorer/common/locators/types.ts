/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregateQuery, Filter, Query } from '@kbn/es-query';

export interface AppState {
  index?: string;
  query?: Query | AggregateQuery;
  filters?: Filter[];
  columns?: string[];
  sort?: string[][];
}

export interface DatasetLocatorDependencies {
  useHash: boolean;
}
