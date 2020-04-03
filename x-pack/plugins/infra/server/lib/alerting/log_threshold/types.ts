/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const LOG_THRESHOLD_ALERT_TYPE_ID = 'logs.alert.threshold';

export enum Comparator {
  GT = '>',
  GT_OR_EQ = '>=',
}

export enum AlertStates {
  OK,
  ALERT,
  NO_DATA,
  ERROR,
}

export interface LogThresholdAlertParams {
  threshold: number;
  comparator: Comparator;
  timeUnit: 's' | 'm' | 'h' | 'd';
  timeSize: number;
}
