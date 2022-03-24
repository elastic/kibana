/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentPolicyFormValidation } from './agent_policy_validation';
describe('Agent Policy form validation', () => {
  it('should not return errors when agentPolicy is valid', () => {
    const result = agentPolicyFormValidation({
      namespace: 'default',
      name: 'policy',
    });
    expect(result).toEqual({});
  });

  it('should return error when agentPolicy has empty name', () => {
    const result = agentPolicyFormValidation({
      namespace: 'default',
      name: '',
    });
    expect(result.name).toBeDefined();
  });

  it('should return error when agentPolicy has empty namespace', () => {
    const result = agentPolicyFormValidation({
      namespace: 'Default',
      name: 'policy',
    });
    expect(result.namespace).toBeDefined();
  });

  it('should return error when agentPolicy has negative unenroll timeout', () => {
    const result = agentPolicyFormValidation({
      namespace: 'Default',
      name: 'policy',
      unenroll_timeout: -1,
    });
    expect(result.unenroll_timeout).toBeDefined();
  });
});
