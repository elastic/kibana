/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RefreshInterval } from '@kbn/data-plugin/common';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { IDatasetsClient } from '@kbn/log-explorer-plugin/public/services/datasets';
import { SerializableRecord } from '@kbn/utility-types';

export interface DatasetLocatorParams extends SerializableRecord {
  timeRange?: TimeRange;
  /**
   * Optionally set the refresh interval.
   */
  refreshInterval?: RefreshInterval;
  /**
   * Optionally apply filters.
   */
  filters?: Filter[];
  /**
   * Optionally set a query.
   */
  query?: Query | AggregateQuery;
  /**
   * Columns displayed in the table
   */
  columns?: string[];
  /**
   * Array of the used sorting [[field,direction],...]
   */
  sort?: string[][];
}

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
