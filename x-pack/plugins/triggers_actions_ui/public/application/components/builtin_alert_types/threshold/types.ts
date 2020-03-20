/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface Comparator {
  text: string;
  value: string;
  requiredValues: number;
}

export interface AggregationType {
  text: string;
  fieldRequired: boolean;
  value: string;
  validNormalizedTypes: string[];
}

export interface GroupByType {
  text: string;
  sizeRequired: boolean;
  value: string;
  validNormalizedTypes: string[];
}

export interface IndexThresholdAlertParams {
  index: string[];
  timeField?: string;
  aggType: string;
  aggField?: string;
  groupBy?: string;
  termSize?: number;
  termField?: string;
  thresholdComparator?: string;
  threshold: number[];
  timeWindowSize: number;
  timeWindowUnit: string;
}
