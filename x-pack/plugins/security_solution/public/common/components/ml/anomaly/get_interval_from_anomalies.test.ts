/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { cloneDeep } from 'lodash/fp';
import { getIntervalFromAnomalies } from './get_interval_from_anomalies';
import { mockAnomalies } from '../mock';

describe('get_interval_from_anomalies', () => {
  let anomalies = cloneDeep(mockAnomalies);

  beforeEach(() => {
    anomalies = cloneDeep(mockAnomalies);
  });

  test('returns "day" if anomalies is null', () => {
    const interval = getIntervalFromAnomalies(null);
    expect(interval).toEqual('day');
  });

  test('returns normal interval from the mocks', () => {
    anomalies.interval = 'month';
    const interval = getIntervalFromAnomalies(anomalies);
    expect(interval).toEqual('month');
  });
});
