/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { SetupTechnology } from '@kbn/fleet-plugin/public';
import { AgentPolicy, NewPackagePolicyInput } from '@kbn/fleet-plugin/common';

import {
  CLOUDBEAT_AWS,
  CLOUDBEAT_AZURE,
  CLOUDBEAT_EKS,
  CLOUDBEAT_GCP,
} from '../../../../common/constants';
import { useSetupTechnology } from './use_setup_technology';

describe('useSetupTechnology', () => {
  describe('create page flow', () => {
    const isEditPage = false;

    it('initializes with AGENT_BASED technology', () => {
      const { result } = renderHook(() =>
        useSetupTechnology({
          input: { type: 'cloudbeat/no-agentless-support' } as NewPackagePolicyInput,
          isEditPage,
        })
      );
      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENT_BASED);
    });

    it('sets to AGENTLESS when agentless is available and AWS cloud', () => {
      const agentlessPolicy = { id: 'agentlessPolicyId' } as AgentPolicy;
      const input = { type: CLOUDBEAT_AWS } as NewPackagePolicyInput;
      const { result } = renderHook(() =>
        useSetupTechnology({ input, agentlessPolicy, isEditPage })
      );
      expect(result.current.isAgentlessAvailable).toBeTruthy();
      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENTLESS);
    });

    it('sets to AGENTLESS when agentless is available and GCP cloud', () => {
      const agentlessPolicy = { id: 'agentlessPolicyId' } as AgentPolicy;
      const input = { type: CLOUDBEAT_GCP } as NewPackagePolicyInput;
      const { result } = renderHook(() =>
        useSetupTechnology({ input, agentlessPolicy, isEditPage })
      );
      expect(result.current.isAgentlessAvailable).toBeTruthy();
      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENTLESS);
    });

    it('sets to AGENTLESS when agentless is available and Azure cloud', () => {
      const agentlessPolicy = { id: 'agentlessPolicyId' } as AgentPolicy;
      const input = { type: CLOUDBEAT_AZURE } as NewPackagePolicyInput;
      const { result } = renderHook(() =>
        useSetupTechnology({ input, agentlessPolicy, isEditPage })
      );
      expect(result.current.isAgentlessAvailable).toBeTruthy();
      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENTLESS);
    });

    it('sets to AGENT_BASED when agentless is available but input is not supported for agentless', () => {
      const agentlessPolicy = { id: 'agentlessPolicyId' } as AgentPolicy;
      const input = { type: CLOUDBEAT_EKS } as NewPackagePolicyInput;
      const { result } = renderHook(() =>
        useSetupTechnology({ input, agentlessPolicy, isEditPage })
      );
      expect(result.current.isAgentlessAvailable).toBeFalsy();
      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENT_BASED);
    });

    it('sets to AGENT_BASED when agentPolicyId differs from agentlessPolicyId', () => {
      const input = { type: CLOUDBEAT_AWS } as NewPackagePolicyInput;
      const agentPolicies = [{ id: 'agentPolicyId' } as AgentPolicy];
      const agentlessPolicy = { id: 'agentlessPolicyId' } as AgentPolicy;
      const { result } = renderHook(() =>
        useSetupTechnology({ input, agentPolicies, agentlessPolicy, isEditPage })
      );
      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENT_BASED);
    });

    it('calls handleSetupTechnologyChange when setupTechnology changes', () => {
      const handleSetupTechnologyChangeMock = jest.fn();
      const { result } = renderHook(() =>
        useSetupTechnology({
          input: { type: 'someType' } as NewPackagePolicyInput,
          handleSetupTechnologyChange: handleSetupTechnologyChangeMock,
          isEditPage,
        })
      );

      act(() => {
        result.current.setSetupTechnology(SetupTechnology.AGENTLESS);
      });

      expect(handleSetupTechnologyChangeMock).toHaveBeenCalledWith(SetupTechnology.AGENTLESS);
    });
  });

  describe('edit page flow', () => {
    const isEditPage = true;

    it('initializes with AGENT_BASED technology', () => {
      const { result } = renderHook(() =>
        useSetupTechnology({
          input: { type: 'cloudbeat/no-agentless-support' } as NewPackagePolicyInput,
          isEditPage,
        })
      );
      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENT_BASED);
    });

    it('initializes with AGENTLESS technology if the agent policy id is "agentless"', () => {
      const input = { type: CLOUDBEAT_AWS } as NewPackagePolicyInput;
      const agentPolicies = [{ id: 'agentless' } as AgentPolicy];
      const { result } = renderHook(() =>
        useSetupTechnology({
          input,
          agentPolicies,
          isEditPage,
        })
      );
      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENTLESS);
    });

    it('should not call handleSetupTechnologyChange when setupTechnology changes', () => {
      const handleSetupTechnologyChangeMock = jest.fn();
      const input = { type: CLOUDBEAT_AWS } as NewPackagePolicyInput;
      const { result } = renderHook(() =>
        useSetupTechnology({
          input,
          handleSetupTechnologyChange: handleSetupTechnologyChangeMock,
          isEditPage,
        })
      );

      act(() => {
        result.current.setSetupTechnology(SetupTechnology.AGENTLESS);
      });

      expect(handleSetupTechnologyChangeMock).not.toHaveBeenCalled();
    });

    it('should not update setupTechnology when agentlessPolicyId becomes available', () => {
      const input = { type: CLOUDBEAT_AWS } as NewPackagePolicyInput;
      const agentlessPolicy = { id: 'agentlessPolicyId' } as AgentPolicy;
      const { result, rerender } = renderHook(() =>
        useSetupTechnology({
          input,
          isEditPage,
        })
      );

      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENT_BASED);

      act(() => {
        rerender({
          input,
          agentlessPolicy,
          isEditPage,
        });
      });

      expect(result.current.setupTechnology).toBe(SetupTechnology.AGENT_BASED);
    });
  });
});
