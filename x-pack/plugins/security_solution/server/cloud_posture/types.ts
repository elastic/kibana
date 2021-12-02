/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type Evaluation = 'passed' | 'failed' | 'NA';

export interface BenchmarkStats {
  name: string;
  postureScore: number | undefined;
  totalFindings?: number;
  totalPassed: number | undefined;
  totalFailed: number | undefined;
}

export interface EvaluationStats {
  resource: string;
  value: number;
  evaluation: Evaluation;
}

export interface CloudPostureStats extends BenchmarkStats {
  statsPerBenchmark: BenchmarkStats[];
  evaluationsPerResource: EvaluationStats[];
}
