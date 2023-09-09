/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { LogExplorerNavigationParams } from '@kbn/log-explorer-plugin/common/locators/log_explorer/types';
import type { IDatasetsClient } from '@kbn/log-explorer-plugin/public/services/datasets';

export type DatasetLocatorParams = LogExplorerNavigationParams;

export interface AppState {
  index?: string;
  query?: Query | AggregateQuery;
  filters?: Filter[];
  columns?: string[];
  sort?: string[][];
}

export interface DatasetLocatorDependencies {
  datasetsClient: IDatasetsClient;
  useHash: boolean;
}
