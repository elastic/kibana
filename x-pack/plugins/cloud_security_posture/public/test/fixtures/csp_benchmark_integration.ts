/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/naming-convention */

import Chance from 'chance';
import type { Benchmark } from '../../../common/types';

type CreateCspBenchmarkIntegrationFixtureInput = {
  chance?: Chance.Chance;
} & Partial<Benchmark>;

export const createCspBenchmarkIntegrationFixture = ({
  chance = new Chance(),
  package_policy = {
    revision: chance?.integer(),
    enabled: true,
    id: chance.guid(),
    name: chance.string(),
    policy_id: chance.guid(),
    namespace: chance.string(),
    updated_at: chance.date().toISOString(),
    updated_by: chance.word(),
    created_at: chance.date().toISOString(),
    created_by: chance.word(),
    inputs: [
      {
        type: 'cloudbeat/cis_k8s',
        policy_template: 'kspm',
        enabled: true,
        streams: [
          {
            id: chance?.guid(),
            enabled: true,
            data_stream: {
              type: 'logs',
              dataset: 'cloud_security_posture.findings',
            },
          },
        ],
      },
    ],
    package: {
      name: chance.string(),
      title: chance.string(),
      version: chance.string(),
    },
  },
  agent_policy = {
    id: chance.guid(),
    name: chance.sentence(),
    agents: chance.integer({ min: 0 }),
  },
  rules_count = chance.integer({ min: 0, max: 10 }),
}: CreateCspBenchmarkIntegrationFixtureInput = {}): Benchmark => ({
  package_policy,
  agent_policy,
  rules_count,
});
