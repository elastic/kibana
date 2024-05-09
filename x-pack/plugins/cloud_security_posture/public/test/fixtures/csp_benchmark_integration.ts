/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Benchmark } from '../../../common/types/latest';

type CreateCspBenchmarkIntegrationFixtureInput = {
  chance?: Chance.Chance;
} & Partial<Benchmark>;

export const createCspBenchmarkIntegrationFixture =
  ({}: CreateCspBenchmarkIntegrationFixtureInput = {}): Benchmark => ({
    id: 'cis_aws',
    version: '1.0.1',
    evaluation: 2,
    score: {
      postureScore: 85,
      resourcesEvaluated: 183,
      totalFailed: 66,
      totalFindings: 440,
      totalPassed: 374,
    },
    name: 'CIS Amazon Web Services Foundations',
  });
