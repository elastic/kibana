/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EcsEvent } from '@elastic/ecs';
import Chance from 'chance';
import { CspFinding } from '../../../common/schemas/csp_finding';

const chance = new Chance();

export const getFindingsFixture = (): CspFinding & { id: string } => ({
  cluster_id: chance.guid(),
  id: chance.word(),
  result: {
    expected: {
      source: {},
    },
    evaluation: chance.weighted(['passed', 'failed'], [0.5, 0.5]),
    evidence: {
      filemode: chance.word(),
    },
  },
  rule: {
    audit: chance.paragraph(),
    benchmark: {
      name: 'CIS Kubernetes',
      version: '1.6.0',
      id: 'cis_k8s',
      rule_number: '1.1.1',
      posture_type: 'kspm',
    },
    default_value: chance.sentence(),
    description: chance.paragraph(),
    id: chance.guid(),
    impact: chance.word(),
    name: chance.string(),
    profile_applicability: chance.sentence(),
    rationale: chance.paragraph(),
    references: chance.paragraph(),
    rego_rule_id: 'cis_X_X_X',
    remediation: chance.word(),
    section: chance.sentence(),
    tags: [],
    version: '1.0',
  },
  agent: {
    id: chance.string(),
    name: chance.string(),
    type: chance.string(),
    version: chance.string(),
  },
  resource: {
    name: chance.string(),
    type: chance.string(),
    raw: {} as any,
    sub_type: chance.string(),
    id: chance.string(),
  },
  host: {} as any,
  ecs: {} as any,
  event: {} as EcsEvent,
  '@timestamp': new Date().toISOString(),
});
