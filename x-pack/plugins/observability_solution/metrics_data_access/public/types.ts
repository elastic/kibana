/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Plugin as PluginClass } from '@kbn/core/public';
import type { MetricsDataClient } from './lib/metrics_client';
import type { NodeMetricsTableProps } from './components/infrastructure_node_metrics_tables/shared';

export interface MetricsDataPluginSetup {
  metricsClient: MetricsDataClient;
}

export interface MetricsDataPluginStart {
  metricsClient: MetricsDataClient;
  HostMetricsTable: (props: NodeMetricsTableProps) => JSX.Element;
  PodMetricsTable: (props: NodeMetricsTableProps) => JSX.Element;
  ContainerMetricsTable: (props: NodeMetricsTableProps) => JSX.Element;
}

export type MetricsDataPluginClass = PluginClass<MetricsDataPluginSetup, MetricsDataPluginStart>;
