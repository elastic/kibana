/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { generateNewAgentPolicyWithDefaults } from './generate_new_agent_policy';

describe('generateNewAgentPolicyWithDefaults', () => {
  it('should generate a new agent policy with defaults', () => {
    const newAgentPolicy = generateNewAgentPolicyWithDefaults({
      name: 'test',
    });

    expect(newAgentPolicy).toEqual({
      name: 'test',
      description: '',
      namespace: 'default',
      monitoring_enabled: ['logs', 'metrics', 'endpoint'],
    });
  });

  it('should override defaults', () => {
    const newAgentPolicy = generateNewAgentPolicyWithDefaults({
      name: 'test',
      description: 'test description',
      namespace: 'test-namespace',
      monitoring_enabled: ['logs'],
    });

    expect(newAgentPolicy).toEqual({
      name: 'test',
      description: 'test description',
      namespace: 'test-namespace',
      monitoring_enabled: ['logs'],
    });
  });
});
