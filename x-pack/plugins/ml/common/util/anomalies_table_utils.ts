/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MlAnomaliesTableRecord } from '@kbn/ml-anomaly-utils';

// The table items could be aggregated, so we have to find the item
// that has the closest timestamp to the selected anomaly from the chart.
export function getTableItemClosestToTimestamp(
  anomalies: MlAnomaliesTableRecord[],
  anomalyTime: number
) {
  return anomalies.reduce<MlAnomaliesTableRecord | undefined>((closestItem, currentItem) => {
    if (!closestItem) return currentItem;

    const closestItemDelta = Math.abs(anomalyTime - closestItem.source.timestamp);
    const currentItemDelta = Math.abs(anomalyTime - currentItem.source.timestamp);
    return currentItemDelta < closestItemDelta ? currentItem : closestItem;
  }, undefined);
}
