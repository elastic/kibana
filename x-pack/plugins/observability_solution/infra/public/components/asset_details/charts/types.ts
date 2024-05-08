/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DataView } from '@kbn/data-views-plugin/public';
import type { TimeRange } from '@kbn/es-query';

export type HostMetricTypes = 'cpu' | 'memory' | 'network' | 'disk' | 'log' | 'kpi';
export type KubernetesContainerMetrics = 'cpu' | 'memory';
export type DockerContainerMetrics = 'cpu' | 'memory' | 'network' | 'disk';
export type ContainerMetricTypes = KubernetesContainerMetrics | DockerContainerMetrics;

export interface MetricsChartsFields {
  assetId: string;
  dateRange: TimeRange;
  dataView?: DataView;
  overview?: boolean;
  onShowAll?: (metric: string) => void;
}
