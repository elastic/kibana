/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PostureScore {
  name: string;
  totalFindings?: number;
  postureScore: number | undefined;
  totalPassed: number | undefined;
  totalFailed: number | undefined;
}
export interface CloudPostureStats extends PostureScore {
  statsPerBenchmark: PostureScore[];
  evaluationsPerResource: EvaluationStats[];
}
export interface EvaluationStats {
  resource: string;
  value: number;
  evaluation: 'passed' | 'failed' | 'NA';
}
