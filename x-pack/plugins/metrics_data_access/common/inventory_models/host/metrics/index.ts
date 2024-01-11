/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { snapshot } from './snapshot';
import { tsvb } from './tsvb';
import { InventoryMetricsWithDashboards } from '../../types';
import { type HostFormulas } from './formulas';
import { type HostDashboards } from './dashboards';

// not sure why this is the only model with "count"
const { count, ...exposedHostSnapshotMetrics } = snapshot;

export const hostSnapshotMetricTypes = Object.keys(exposedHostSnapshotMetrics) as Array<
  keyof typeof exposedHostSnapshotMetrics
>;

export const metrics: InventoryMetricsWithDashboards<HostFormulas, HostDashboards> = {
  tsvb,
  snapshot,
  getFormulas: async () => await import('./formulas').then(({ formulas }) => ({ ...formulas })),
  getDashboards: async () =>
    await import('./dashboards').then(({ dashboards }) => ({ ...dashboards })),
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 3600, // 1 hour
};
