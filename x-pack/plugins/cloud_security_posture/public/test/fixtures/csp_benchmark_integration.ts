/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BenchmarkVersion2 } from '../../../common/types';

type CreateCspBenchmarkIntegrationFixtureInput = {
  chance?: Chance.Chance;
} & Partial<BenchmarkVersion2>;

export const createCspBenchmarkIntegrationFixture =
  ({}: CreateCspBenchmarkIntegrationFixtureInput = {}): BenchmarkVersion2 => ({
    benchmark_id: 'cis_aws',
    benchmark_version: '1.0.1',
    benchmark_evaluation: 2,
    benchmark_score: {
      postureScore: 85,
      resourcesEvaluated: 183,
      totalFailed: 66,
      totalFindings: 440,
      totalPassed: 374,
    },
    benchmark_name: 'CIS Amazon Web Services Foundations',
  });
