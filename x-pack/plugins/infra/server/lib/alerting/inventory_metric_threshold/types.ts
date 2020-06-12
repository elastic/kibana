/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { SnapshotMetricType } from '../../../../common/inventory_models/types';

export const METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.inventory.threshold';

export enum Comparator {
  GT = '>',
  LT = '<',
  GT_OR_EQ = '>=',
  LT_OR_EQ = '<=',
  BETWEEN = 'between',
  OUTSIDE_RANGE = 'outside',
}

export enum AlertStates {
  OK,
  ALERT,
  NO_DATA,
  ERROR,
}

export type TimeUnit = 's' | 'm' | 'h' | 'd';

export interface InventoryMetricConditions {
  metric: SnapshotMetricType;
  timeSize: number;
  timeUnit: TimeUnit;
  sourceId?: string;
  threshold: number[];
  comparator: Comparator;
}
