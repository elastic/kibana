/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';
import { InventoryMetricConditions } from '../../../../../common/alerting/metrics';
import { SnapshotCustomMetricInput } from '../../../../../common/http_api';
import { findInventoryModel } from '../../../../../common/inventory_models';
import {
  InventoryItemType,
  SnapshotMetricType,
} from '../../../../../common/inventory_models/types';
import { isRate } from './is_rate';

export const calculateFromBasedOnMetric = (
  to: Moment,
  condition: InventoryMetricConditions,
  nodeType: InventoryItemType,
  metric: SnapshotMetricType,
  customMetric?: SnapshotCustomMetricInput
) => {
  const inventoryModel = findInventoryModel(nodeType);
  const metricAgg = inventoryModel.metrics.snapshot[metric];
  if (isRate(metricAgg, customMetric)) {
    return to
      .clone()
      .subtract(condition.timeSize * 2, condition.timeUnit)
      .valueOf();
  } else {
    return to.clone().subtract(condition.timeSize, condition.timeUnit).valueOf();
  }
};
