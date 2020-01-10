/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export interface SerializeThresholdWatchConfig {
  name: string;
  triggerIntervalSize: number;
  triggerIntervalUnit: string;
  index: string;
  timeWindowSize: number;
  timeWindowUnit: string;
  timeField: string;
  aggType: string;
  aggField: string;
  termField: string;
  termSize: number;
  termOrder: number;
  thresholdComparator: string;
  hasTermsAgg: boolean;
  threshold: number;
  actions: any[];
  includeMetadata: boolean;
}
