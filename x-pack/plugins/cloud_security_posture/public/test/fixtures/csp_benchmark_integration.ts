/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import Chance from 'chance';
import type { CspBenchmarkIntegration } from '../../pages/benchmarks/types';

type CreateCspBenchmarkIntegrationFixtureInput = {
  chance?: Chance.Chance;
} & Partial<CspBenchmarkIntegration>;

export const createCspBenchmarkIntegrationFixture = ({
  chance = new Chance(),
  integration_name = chance.sentence(),
  benchmark = chance.sentence(),
  rules = undefined,
  agent_policy = {
    id: chance.guid(),
    name: chance.sentence(),
    number_of_agents: chance.integer({ min: 1 }),
  },
  created_by = chance.sentence(),
  created_at = chance.date({ year: 2021 }) as Date,
}: CreateCspBenchmarkIntegrationFixtureInput = {}): CspBenchmarkIntegration => {
  let outputRules: CspBenchmarkIntegration['rules'] | undefined = rules;
  if (!outputRules) {
    const activeRules = chance.integer({ min: 1 });
    const totalRules = chance.integer({ min: activeRules });
    outputRules = {
      active: activeRules,
      total: totalRules,
    };
  }

  return {
    integration_name,
    benchmark,
    rules: outputRules,
    agent_policy,
    created_by,
    created_at,
  };
};
