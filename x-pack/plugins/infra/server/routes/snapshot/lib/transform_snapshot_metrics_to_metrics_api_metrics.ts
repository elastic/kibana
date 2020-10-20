/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
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
  return snapshotRequest.metrics.map((metric, index) => {
    const inventoryModel = findInventoryModel(snapshotRequest.nodeType);
    if (SnapshotCustomMetricInputRT.is(metric)) {
      const customId = `custom_${index}`;
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
    return { id: metric.type, aggregations: inventoryModel.metrics.snapshot?.[metric.type] };
  });
};
