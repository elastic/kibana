/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type Evaluation = 'passed' | 'failed' | 'NA';
/** number between 1-100 */
export type Score = number;

export interface FindingsResults {
  totalFindings: number;
  totalPassed: number;
  totalFailed: number;
}

export interface Stats extends FindingsResults {
  postureScore: Score;
}

export interface ResourceTypeAgg extends FindingsResults {
  resourceType: string;
}

export interface BenchmarkStats extends Stats {
  name: string;
}

export interface CloudPostureStats extends Stats {
  benchmarksStats: BenchmarkStats[];
  resourceTypesAggs: ResourceTypeAgg[];
}
