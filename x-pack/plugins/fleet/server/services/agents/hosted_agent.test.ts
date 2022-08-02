/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';

import type { Agent } from '../../types';

import { getHostedPolicies, isHostedAgent } from './hosted_agent';

jest.mock('../agent_policy', () => {
  return {
    agentPolicyService: {
      getByIDs: jest.fn().mockResolvedValue([
        { id: 'hosted-policy', is_managed: true },
        { id: 'regular-policy', is_managed: false },
      ]),
    },
  };
});

describe('hosted agent helpers', () => {
  const soClientMock = savedObjectsClientMock.create();
  const expectedHostedPolicies = {
    'hosted-policy': true,
    'regular-policy': false,
  };

  it('should query unique managed policies', async () => {
    const result = await getHostedPolicies(soClientMock, [
      { policy_id: 'hosted-policy' } as Agent,
      { policy_id: 'hosted-policy' } as Agent,
      { policy_id: 'regular-policy' } as Agent,
      { policy_id: 'regular-policy' } as Agent,
    ]);
    expect(result).toEqual(expectedHostedPolicies);
  });

  it('should return true for hosted policy', () => {
    const isHosted = isHostedAgent(expectedHostedPolicies, { policy_id: 'hosted-policy' } as Agent);
    expect(isHosted).toBeTruthy();
  });

  it('should return false for regular policy', () => {
    const isHosted = isHostedAgent(expectedHostedPolicies, {
      policy_id: 'regular-policy',
    } as Agent);
    expect(isHosted).toBeFalsy();
  });

  it('should return false for missing policy_id', () => {
    const isHosted = isHostedAgent(expectedHostedPolicies, {} as Agent);
    expect(isHosted).toBeFalsy();
  });

  it('should return false for non existing policy', () => {
    const isHosted = isHostedAgent(expectedHostedPolicies, { policy_id: 'dummy-policy' } as Agent);
    expect(isHosted).toBeFalsy();
  });
});
