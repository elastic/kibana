/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_RULE_NAME,
  ALERT_STATUS,
  ALERT_START,
  ALERT_END,
  ALERT_DURATION,
} from '@kbn/rule-data-utils';
import type { AnomalyDetectionAlert } from './anomaly_detection_alerts_state_service';
import { getAlertsSummary } from './get_alerts_summary';

describe('getAlertsSummary', () => {
  test('should return an empty array when given an empty array', () => {
    const alertsData: AnomalyDetectionAlert[] = [];
    const result = getAlertsSummary(alertsData);
    expect(result).toEqual([]);
  });

  test('should group alerts by rule name and return a sorted array of rule summaries', () => {
    const timestamp01 = new Date('2022-01-01T00:00:00.000Z').getTime();
    const timestamp02 = new Date('2022-01-01T01:00:00.000Z').getTime();
    const timestamp03 = new Date('2022-01-01T02:00:00.000Z').getTime();
    const timestamp04 = new Date('2022-01-01T04:00:00.000Z').getTime();

    const alertsData: AnomalyDetectionAlert[] = [
      {
        [ALERT_RULE_NAME]: 'rule-1',
        [ALERT_STATUS]: 'active',
        [ALERT_START]: timestamp01,
        [ALERT_END]: timestamp02,
        [ALERT_DURATION]: 3600000,
      },
      {
        [ALERT_RULE_NAME]: 'rule-1',
        [ALERT_STATUS]: 'recovered',
        [ALERT_START]: timestamp02,
        [ALERT_END]: timestamp03,
        [ALERT_DURATION]: 3600000,
      },
      {
        [ALERT_RULE_NAME]: 'rule-2',
        [ALERT_STATUS]: 'active',
        [ALERT_START]: timestamp01,
        [ALERT_END]: timestamp02,
        [ALERT_DURATION]: 3600000,
      },
      {
        [ALERT_RULE_NAME]: 'rule-2',
        [ALERT_STATUS]: 'active',
        [ALERT_START]: timestamp01,
        [ALERT_END]: timestamp02,
        [ALERT_DURATION]: 3600000,
      },
      {
        [ALERT_RULE_NAME]: 'rule-2',
        [ALERT_STATUS]: 'recovered',
        [ALERT_START]: timestamp02,
        [ALERT_END]: timestamp04,
        [ALERT_DURATION]: 3600000,
      },
      {
        [ALERT_RULE_NAME]: 'rule-3',
        [ALERT_STATUS]: 'recovered',
        [ALERT_START]: timestamp02,
        [ALERT_END]: timestamp04,
        [ALERT_DURATION]: 3600000,
      },
      {
        [ALERT_RULE_NAME]: 'rule-4',
        [ALERT_STATUS]: 'recovered',
        [ALERT_START]: timestamp02,
        [ALERT_END]: timestamp04,
        [ALERT_DURATION]: 6400000,
      },
    ] as AnomalyDetectionAlert[];

    const result = getAlertsSummary(alertsData);

    expect(result).toEqual([
      [
        'rule-2',
        {
          totalCount: 3,
          activeCount: 2,
          recoveredAt: timestamp04,
          startedAt: timestamp02,
          lastDuration: 3600000,
        },
      ],
      [
        'rule-1',
        {
          totalCount: 2,
          activeCount: 1,
          recoveredAt: timestamp03,
          startedAt: timestamp02,
          lastDuration: 3600000,
        },
      ],
      [
        'rule-4',
        {
          totalCount: 1,
          activeCount: 0,
          recoveredAt: timestamp04,
          startedAt: timestamp02,
          lastDuration: 6400000,
        },
      ],
      [
        'rule-3',
        {
          totalCount: 1,
          activeCount: 0,
          recoveredAt: timestamp04,
          startedAt: timestamp02,
          lastDuration: 3600000,
        },
      ],
    ]);
  });
});
