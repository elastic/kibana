/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { networkTraffic } from '../../../../common/inventory_models/shared/metrics/snapshot/network_traffic';
import { findInventoryModel } from '../../../../common/inventory_models';
import {
  MetricsAPIMetric,
  SnapshotRequest,
  SnapshotCustomMetricInputRT,
} from '../../../../common/http_api';

export const transformSnapshotMetricsToMetricsAPIMetrics = (
  snapshotRequest: SnapshotRequest
): MetricsAPIMetric[] => {
  return snapshotRequest.metrics
    .map((metric, index) => {
      const inventoryModel = findInventoryModel(snapshotRequest.nodeType);
      if (SnapshotCustomMetricInputRT.is(metric)) {
        const isUniqueId = snapshotRequest.metrics.findIndex((m) =>
          SnapshotCustomMetricInputRT.is(m) ? m.id === metric.id : false
        );
        const customId = isUniqueId ? metric.id : `custom_${index}`;
        if (metric.aggregation === 'rate') {
          return { id: customId, aggregations: networkTraffic(customId, metric.field) };
        }
        return {
          id: customId,
          aggregations: {
            [customId]: {
              [metric.aggregation]: {
                field: metric.field,
              },
            },
          },
        };
      }
      const aggregations = inventoryModel.metrics.snapshot?.[metric.type];
      if (!aggregations) {
        return null;
      }
      return { id: metric.type, aggregations };
    })
    .filter((val) => val != null) as MetricsAPIMetric[];
};
