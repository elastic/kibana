/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './agent_enrollment_flyout.test.mocks';

import React from 'react';
import { act, cleanup, fireEvent, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../mock';
import type { AgentPolicy } from '../../../common';
import { sendGetOneAgentPolicy } from '../../hooks/use_request';
import { useAgentEnrollmentFlyoutData, useAuthz, useFleetServerStandalone } from '../../hooks';

import { useAdvancedForm } from '../../applications/fleet/components/fleet_server_instructions/hooks';
import { useFleetServerUnhealthy } from '../../applications/fleet/sections/agents/hooks/use_fleet_server_unhealthy';

import type { FlyOutProps } from './types';
import { AgentEnrollmentFlyout } from '.';

const render = (props?: Partial<FlyOutProps>) => {
  cleanup();
  const renderer = createFleetTestRendererMock();
  const results = renderer.render(<AgentEnrollmentFlyout onClose={jest.fn()} {...props} />);

  return results;
};

const testAgentPolicy: AgentPolicy = {
  id: 'test',
  is_managed: false,
  namespace: 'test',
  package_policies: [],
  revision: 1,
  status: 'active',
  updated_at: 'test',
  updated_by: 'test',
  name: 'test',
  is_protected: false,
};

describe('<AgentEnrollmentFlyout />', () => {
  let results: RenderResult;

  beforeEach(async () => {
    jest.mocked(useAuthz).mockReturnValue({
      fleet: {
        readAgentPolicies: true,
      },
      integrations: {},
    } as any);
    jest.mocked(useFleetServerStandalone).mockReturnValue({ isFleetServerStandalone: false });

    (useFleetServerUnhealthy as jest.Mock).mockReturnValue({
      isLoading: false,
      isUnhealthy: false,
    });

    (sendGetOneAgentPolicy as jest.Mock).mockResolvedValue({
      data: { item: { package_policies: [] } },
    });

    (useAdvancedForm as jest.Mock).mockReturnValue({
      eligibleFleetServerPolicies: [{ name: 'test', id: 'test' }],
      refreshEligibleFleetServerPolicies: jest.fn(),
      fleetServerPolicyId: 'test',
      setFleetServerPolicyId: jest.fn(),
      isFleetServerReady: true,
      serviceToken: 'test',
      isLoadingServiceToken: false,
      generateServiceToken: jest.fn(),
      fleetServerHostForm: {
        submitForm: jest.fn(),
        fleetServerHost: 'https://test.server:8220',
        setFleetServerHost: jest.fn(),
        error: '',
        validateFleetServerHost: jest.fn(),
      },
      deploymentMode: 'quickstart',
      setDeploymentMode: jest.fn(),
    });

    (useAgentEnrollmentFlyoutData as jest.Mock).mockReturnValue?.({
      agentPolicies: [{ id: 'fleet-server-policy' } as AgentPolicy],
      refreshAgentPolicies: jest.fn(),
    });

    act(() => {
      results = render();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should show loading when agent policies are loading', () => {
    (useAgentEnrollmentFlyoutData as jest.Mock).mockReturnValue?.({
      agentPolicies: [],
      refreshAgentPolicies: jest.fn(),
      isLoadingInitialAgentPolicies: true,
    });

    results = render();

    expect(results.queryByTestId('agentEnrollmentFlyout')).not.toBeNull();
    expect(results.queryByTestId('loadingSpinner')).not.toBeNull();
  });

  describe('managed instructions', () => {
    it('uses the agent policy selection step', () => {
      expect(results.queryByTestId('agentEnrollmentFlyout')).not.toBeNull();
      expect(results.queryByTestId('agent-policy-selection-step')).not.toBeNull();
      expect(results.queryByTestId('agent-enrollment-key-selection-step')).toBeNull();
    });

    describe('with a specific policy', () => {
      beforeEach(async () => {
        results = render({
          agentPolicy: testAgentPolicy,
        });
        await waitFor(() => {
          expect(sendGetOneAgentPolicy).toBeCalled();
        });
      });

      it('uses the configure enrollment step, not the agent policy selection step', () => {
        expect(results.queryByTestId('agentEnrollmentFlyout')).not.toBeNull();
        expect(results.queryByTestId('agent-policy-selection-step')).toBeNull();
        expect(results.queryByTestId('agent-enrollment-key-selection-step')).not.toBeNull();
      });
    });

    describe('with a specific policy when no agentPolicies set', () => {
      beforeEach(async () => {
        jest.clearAllMocks();
        results = render({
          agentPolicy: testAgentPolicy,
        });
        await waitFor(() => {
          expect(sendGetOneAgentPolicy).toBeCalled();
        });
      });

      it('should not show fleet server instructions', () => {
        expect(results.queryByTestId('agentEnrollmentFlyout')).not.toBeNull();
        expect(results.queryByTestId('agent-enrollment-key-selection-step')).not.toBeNull();
      });
    });

    describe('standalone instructions', () => {
      function goToStandaloneTab() {
        act(() => {
          fireEvent.click(results.getByTestId('standaloneTab'));
        });
      }

      beforeEach(() => {
        results = render({
          isIntegrationFlow: true,
        });
      });

      it('uses the agent policy selection step', async () => {
        goToStandaloneTab();

        expect(results.queryByTestId('agentEnrollmentFlyout')).not.toBeNull();
        expect(results.queryByTestId('agent-policy-selection-step')).not.toBeNull();
        expect(results.queryByTestId('agent-enrollment-key-selection-step')).toBeNull();
        expect(results.queryByTestId('configure-standalone-step')).not.toBeNull();
      });

      describe('with a specific policy', () => {
        beforeEach(async () => {
          results = render({
            isIntegrationFlow: true,
            agentPolicy: testAgentPolicy,
          });
          await waitFor(() => {
            expect(sendGetOneAgentPolicy).toBeCalled();
          });
        });

        it('does not use either of the agent policy selection or enrollment key steps', () => {
          goToStandaloneTab();

          expect(results.queryByTestId('agentEnrollmentFlyout')).not.toBeNull();
          expect(results.queryByTestId('agent-policy-selection-step')).toBeNull();
          expect(results.queryByTestId('agent-enrollment-key-selection-step')).toBeNull();
          expect(results.queryByTestId('configure-standalone-step')).not.toBeNull();
        });
      });
    });
  });
});
