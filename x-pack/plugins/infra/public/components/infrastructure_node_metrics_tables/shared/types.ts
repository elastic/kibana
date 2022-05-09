/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { CoreProvidersProps } from '../../../apps/common_providers';
import type { MetricsExplorerTimeOptions } from '../../../pages/metrics/metrics_explorer/hooks/use_metrics_explorer_options';

export interface UseNodeMetricsTableOptions {
  timerange: Pick<MetricsExplorerTimeOptions, 'from' | 'to'>;
  filterClauseDsl?: QueryDslQueryContainer;
}

export interface SourceProviderProps {
  sourceId: string;
}

export type IntegratedNodeMetricsTableProps = UseNodeMetricsTableOptions &
  SourceProviderProps &
  CoreProvidersProps;
