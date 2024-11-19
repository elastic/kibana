/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InventoryMetricsWithCharts } from '../../types';
import { cpu } from './snapshot/cpu';
import { memory } from './snapshot/memory';
import { rx } from './snapshot/rx';
import { tx } from './snapshot/tx';
import type { ContainerFormulas } from './formulas';
import { ContainerCharts } from './charts';

const containerSnapshotMetrics = { cpu, memory, rx, tx };

export const containerSnapshotMetricTypes = Object.keys(containerSnapshotMetrics) as Array<
  keyof typeof containerSnapshotMetrics
>;

export const metrics: InventoryMetricsWithCharts<ContainerFormulas, ContainerCharts> = {
  snapshot: containerSnapshotMetrics,
  getFormulas: async () => await import('./formulas').then(({ formulas }) => formulas),
  getCharts: async () => await import('./charts').then(({ charts }) => charts),
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 3600, // 1 hour
};
