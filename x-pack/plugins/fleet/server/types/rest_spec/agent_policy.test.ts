/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

import { GetAgentPoliciesRequestSchema } from './agent_policy';

describe('GetAgentPoliciesRequestSchema.query', () => {
  it('should work without query parameters', () => {
    expect(() => GetAgentPoliciesRequestSchema.query.validate({})).not.toThrow();
  });

  it('should work without perPage being less than 100', () => {
    expect(() => GetAgentPoliciesRequestSchema.query.validate({ perPage: 50 })).not.toThrow();
  });

  it('should work without perPage being less than 100 and agentCount and full', () => {
    expect(() =>
      GetAgentPoliciesRequestSchema.query.validate({ perPage: 50, full: true, noAgentCount: false })
    ).not.toThrow();
  });

  it('should throw without perPage being more than 100 and agentCount', () => {
    expect(() =>
      GetAgentPoliciesRequestSchema.query.validate({
        perPage: 500,
        noAgentCount: false,
      })
    ).toThrow(/perPage should be less or equal to 100 when fetching full policies or agent count./);
  });

  it('should throw without perPage being more than 100 and full', () => {
    expect(() =>
      GetAgentPoliciesRequestSchema.query.validate({
        perPage: 500,
        noAgentCount: true,
        full: true,
      })
    ).toThrow(/perPage should be less or equal to 100 when fetching full policies or agent count./);
  });

  it('should not throw with perPage being more than 100 and no agentCount and no full', () => {
    expect(() =>
      GetAgentPoliciesRequestSchema.query.validate({
        perPage: 500,
        full: false,
        noAgentCount: true,
      })
    ).not.toThrow();
  });
});
