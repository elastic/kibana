/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Unit } from '@elastic/datemath';
import { SnapshotMetricType } from '../../../../common/inventory_models/types';
import { Comparator, AlertStates } from '../common/types';

export { Comparator, AlertStates };

export const METRIC_INVENTORY_THRESHOLD_ALERT_TYPE_ID = 'metrics.alert.inventory.threshold';

export interface InventoryMetricConditions {
  metric: SnapshotMetricType;
  timeSize: number;
  timeUnit: Unit;
  sourceId?: string;
  threshold: number[];
  comparator: Comparator;
}
