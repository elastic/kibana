/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { snapshot } from './snapshot';
import { InventoryMetricsWithCharts } from '../../types';
import type { HostFormulas } from './formulas';
import type { HostCharts } from './charts';

// not sure why this is the only model with "count"
const { count, ...exposedHostSnapshotMetrics } = snapshot;

export const hostSnapshotMetricTypes = Object.keys(exposedHostSnapshotMetrics) as Array<
  keyof typeof exposedHostSnapshotMetrics
>;

export const metrics: InventoryMetricsWithCharts<HostFormulas, HostCharts> = {
  snapshot,
  getFormulas: async () => await import('./formulas').then(({ formulas }) => formulas),
  getCharts: async () => await import('./charts').then(({ charts }) => charts),
  defaultSnapshot: 'cpuV2',
  defaultTimeRangeInSeconds: 3600, // 1 hour
};
