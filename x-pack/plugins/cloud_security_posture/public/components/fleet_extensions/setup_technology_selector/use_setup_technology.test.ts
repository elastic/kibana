/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { AgentPolicy, NewPackagePolicyInput } from '@kbn/fleet-plugin/common';

import { CLOUDBEAT_AWS } from '../../../../common/constants';
import { useSetupTechnology } from './use_setup_technology';

describe('useSetupTechnology', () => {
  it('initializes with AGENT_BASED technology', () => {
    const { result } = renderHook(() =>
      useSetupTechnology({
        input: { type: 'cloudbeat/no-agentless-support' } as NewPackagePolicyInput,
      })
    );
    expect(result.current.setupTechnology).toBe(SetupTechnology.AGENT_BASED);
  });

  it('sets to AGENTLESS when agentless is available', () => {
    const agentlessPolicy = { id: 'agentlessPolicyId' } as AgentPolicy;
    const input = { type: CLOUDBEAT_AWS } as NewPackagePolicyInput;
    const { result } = renderHook(() => useSetupTechnology({ input, agentlessPolicy }));
    expect(result.current.isAgentlessAvailable).toBeTruthy();
    expect(result.current.setupTechnology).toBe(SetupTechnology.AGENTLESS);
  });

  it('sets to AGENT_BASED when agentPolicyId differs from agentlessPolicyId', () => {
    const input = { type: CLOUDBEAT_AWS } as NewPackagePolicyInput;
    const agentPolicy = { id: 'agentPolicyId' } as AgentPolicy;
    const agentlessPolicy = { id: 'agentlessPolicyId' } as AgentPolicy;
    const { result } = renderHook(() =>
      useSetupTechnology({ input, agentPolicy, agentlessPolicy })
    );
    expect(result.current.setupTechnology).toBe(SetupTechnology.AGENT_BASED);
  });

  it('calls handleSetupTechnologyChange when setupTechnology changes', () => {
    const handleSetupTechnologyChangeMock = jest.fn();
    const { result } = renderHook(() =>
      useSetupTechnology({
        input: { type: 'someType' } as NewPackagePolicyInput,
        handleSetupTechnologyChange: handleSetupTechnologyChangeMock,
      })
    );

    act(() => {
      result.current.setSetupTechnology(SetupTechnology.AGENTLESS);
    });

    expect(handleSetupTechnologyChangeMock).toHaveBeenCalledWith(SetupTechnology.AGENTLESS);
  });
});
