/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface Detector {
  identifier: string;
  function: string;
  field?: string;
  byField?: string;
  overField?: string;
  partitionField?: string;
  excludeFrequent?: string;
  description?: string;
}

export interface DatafeedConfig {
  queryDelay?: string;
  frequency?: string;
  scrollSize?: string;
}

export interface PickFieldsConfig {
  detectors: Detector[];
  influencers: string[];
  bucketSpan: string;
  memoryLimit: string;
  categorizationField?: string;
  summaryCountField?: string;
}
