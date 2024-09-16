/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';

import type { MlAnomaliesTableRecord } from '@kbn/ml-anomaly-utils';

import { getTableItemClosestToTimestamp } from './anomalies_table_utils';

import mockAnomaliesTableData from '../__mocks__/mock_anomalies_table_data.json';

describe('getTableItemClosestToTimestamp', () => {
  const anomalies: MlAnomaliesTableRecord[] = mockAnomaliesTableData.default.anomalies;
  anomalies.push(cloneDeep(anomalies[0]));
  anomalies[0].source.timestamp = 1000;
  anomalies[1].source.timestamp = 2000;
  anomalies[2].source.timestamp = 3000;

  it('should return the first item if it is the closest', () => {
    const anomalyTime = 1400;
    const closestItem = getTableItemClosestToTimestamp(anomalies, anomalyTime);
    expect(closestItem && closestItem.source.timestamp).toBe(1000);
  });

  it('should return the last item if it is the closest', () => {
    const anomalyTime = 5000;
    const closestItem = getTableItemClosestToTimestamp(anomalies, anomalyTime);
    expect(closestItem && closestItem.source.timestamp).toBe(3000);
  });

  it('should return the second item if it is the closest', () => {
    const anomalyTime = 2600;
    const closestItem = getTableItemClosestToTimestamp(anomalies, anomalyTime);
    expect(closestItem && closestItem.source.timestamp).toBe(3000);
  });

  it('should handle an empty anomalies array', () => {
    const anomalyTime = 2000;
    const closestItem = getTableItemClosestToTimestamp([], anomalyTime);
    expect(closestItem).toBeUndefined();
  });
});
