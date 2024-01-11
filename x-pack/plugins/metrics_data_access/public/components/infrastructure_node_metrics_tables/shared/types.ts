/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { CoreProvidersProps } from '../../../apps/common_providers';
import type { MetricsDataClient } from '../../../lib/metrics_client';

export interface UseNodeMetricsTableOptions {
  timerange: { from: string; to: string };
  filterClauseDsl?: QueryDslQueryContainer;
  metricsClient: MetricsDataClient;
}

export interface SourceProviderProps {
  sourceId: string;
}

export type IntegratedNodeMetricsTableProps = UseNodeMetricsTableOptions &
  SourceProviderProps &
  CoreProvidersProps;

export type NodeMetricsTableProps = Omit<UseNodeMetricsTableOptions, 'metricsClient'> &
  Partial<SourceProviderProps>;

export type NodeMetricsTableData<NodeMetricsRow> =
  | {
      state: 'unknown';
    }
  | {
      state: 'no-indices';
    }
  | {
      state: 'empty-indices';
    }
  | {
      state: 'data';
      currentPageIndex: number;
      pageCount: number;
      rows: NodeMetricsRow[];
    }
  | {
      state: 'error';
      errors: Error[];
    };
