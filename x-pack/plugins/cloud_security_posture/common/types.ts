/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type Evaluation = 'passed' | 'failed' | 'NA';
/** number between 1-100 */
export type Score = number;

export interface FindingsEvaluation {
  totalFindings: number;
  totalPassed: number;
  totalFailed: number;
}

export interface Stats extends FindingsEvaluation {
  postureScore: Score;
}

export interface ResourceType extends FindingsEvaluation {
  name: string;
}

export interface Cluster {
  meta: {
    clusterId: string;
    benchmarkName: string;
  };
  stats: Stats;
  resourcesTypes: ResourceType[];
}

export interface CloudPostureStats {
  stats: Stats;
  resourcesTypes: ResourceType[];
  clusters: Cluster[];
}
