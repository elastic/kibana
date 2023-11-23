/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { snapshot } from './snapshot';
import { tsvb } from './tsvb';
import { formulas } from './formulas';
import { assetDetails, assetDetailsFlyout, hostsView, kpi } from './dashboards';
import { InventoryMetrics } from '../../types';

// not sure why this is the only model with "count"
const { count, ...exposedHostSnapshotMetrics } = snapshot;

const dashboards = { assetDetails, assetDetailsFlyout, hostsView, kpi };

export const hostSnapshotMetricTypes = Object.keys(exposedHostSnapshotMetrics) as Array<
  keyof typeof exposedHostSnapshotMetrics
>;

export const metrics: InventoryMetrics<
  typeof tsvb,
  typeof snapshot,
  typeof formulas,
  typeof dashboards
> = {
  tsvb,
  snapshot,
  formulas,
  dashboards,
  defaultSnapshot: 'cpu',
  defaultTimeRangeInSeconds: 3600, // 1 hour
};
