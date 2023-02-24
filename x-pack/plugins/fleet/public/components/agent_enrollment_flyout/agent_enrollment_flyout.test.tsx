/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './agent_enrollment_flyout.test.mocks';

import React from 'react';
import { registerTestBed } from '@kbn/test-jest-helpers';
import { act } from '@testing-library/react';

import { coreMock } from '@kbn/core/public/mocks';

import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

import type { AgentPolicy } from '../../../common';
import {
  useGetFleetServerHosts,
  sendGetOneAgentPolicy,
  useGetAgents,
} from '../../hooks/use_request';
import {
  FleetStatusProvider,
  ConfigContext,
  useAgentEnrollmentFlyoutData,
  KibanaVersionContext,
  useFleetStatus,
  useFleetServerStandalone,
} from '../../hooks';

import { useAdvancedForm } from '../../applications/fleet/components/fleet_server_instructions/hooks';
import { useFleetServerUnhealthy } from '../../applications/fleet/sections/agents/hooks/use_fleet_server_unhealthy';

import type { FlyOutProps } from './types';
import { AgentEnrollmentFlyout } from '.';

const TestComponent = (props: FlyOutProps) => (
  <KibanaContextProvider services={coreMock.createStart()}>
    <ConfigContext.Provider value={{ agents: { enabled: true, elasticsearch: {} }, enabled: true }}>
      <KibanaVersionContext.Provider value={'8.1.0'}>
        <FleetStatusProvider>
          <AgentEnrollmentFlyout {...props} />
        </FleetStatusProvider>
      </KibanaVersionContext.Provider>
    </ConfigContext.Provider>
  </KibanaContextProvider>
);

const setup = (props?: FlyOutProps) => {
  const testBed = registerTestBed(TestComponent)(props);
  const { find, component } = testBed;

  return {
    ...testBed,
    actions: {
      goToStandaloneTab: () =>
        act(() => {
          find('agentEnrollmentFlyout.standaloneTab').simulate('click');
          component.update();
        }),
    },
  };
};

type SetupReturn = ReturnType<typeof setup>;
type TestBed = SetupReturn extends Promise<infer U> ? U : SetupReturn;

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
};

describe('<AgentEnrollmentFlyout />', () => {
  let testBed: TestBed;

  beforeEach(() => {
    (useGetFleetServerHosts as jest.Mock).mockReturnValue({
      data: {
        items: [
          {
            is_default: true,
            host_urls: ['http://test.fr'],
          },
        ],
      },
    });
    jest.mocked(useFleetServerStandalone).mockReturnValue({ isFleetServerStandalone: false });

    (useFleetStatus as jest.Mock).mockReturnValue({ isReady: true });
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
        saveFleetServerHost: jest.fn(),
        fleetServerHost: 'https://test.server:8220',
        setFleetServerHost: jest.fn(),
        error: '',
        validateFleetServerHost: jest.fn(),
      },
      deploymentMode: 'quickstart',
      setDeploymentMode: jest.fn(),
    });

    (useGetAgents as jest.Mock).mockReturnValue({
      data: { items: [{ policy_id: 'fleet-server-policy' }] },
    });

    (useAgentEnrollmentFlyoutData as jest.Mock).mockReturnValue?.({
      agentPolicies: [{ id: 'fleet-server-policy' } as AgentPolicy],
      refreshAgentPolicies: jest.fn(),
    });

    act(() => {
      testBed = setup({
        onClose: jest.fn(),
      });
      testBed.component.update();
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

    act(() => {
      testBed = setup({
        onClose: jest.fn(),
      });
      testBed.component.update();
    });

    const { exists } = testBed;
    expect(exists('agentEnrollmentFlyout')).toBe(true);
    expect(exists('loadingSpinner')).toBe(true);
  });

  describe('managed instructions', () => {
    it('uses the agent policy selection step', () => {
      const { exists } = testBed;
      expect(exists('agentEnrollmentFlyout')).toBe(true);
      expect(exists('agent-policy-selection-step')).toBe(true);
      expect(exists('agent-enrollment-key-selection-step')).toBe(false);
    });

    describe('with a specific policy', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        act(() => {
          testBed = setup({
            agentPolicy: testAgentPolicy,
            onClose: jest.fn(),
          });
          testBed.component.update();
        });
      });

      it('uses the configure enrollment step, not the agent policy selection step', () => {
        const { exists } = testBed;
        expect(exists('agentEnrollmentFlyout')).toBe(true);
        expect(exists('agent-policy-selection-step')).toBe(false);
        expect(exists('agent-enrollment-key-selection-step')).toBe(true);
      });
    });

    describe('with a specific policy when no agentPolicies set', () => {
      beforeEach(() => {
        jest.clearAllMocks();
        act(() => {
          testBed = setup({
            agentPolicy: testAgentPolicy,
            onClose: jest.fn(),
          });
          testBed.component.update();
        });
      });

      it('should not show fleet server instructions', () => {
        const { exists } = testBed;
        expect(exists('agentEnrollmentFlyout')).toBe(true);
        expect(exists('agent-enrollment-key-selection-step')).toBe(true);
      });
    });

    // Skipped due to UI changing in https://github.com/elastic/kibana/issues/125534. These tests should be rethought overall
    // to provide value around the new flyout structure
    describe.skip('standalone instructions', () => {
      it('uses the agent policy selection step', async () => {
        const { exists, actions } = testBed;
        actions.goToStandaloneTab();

        expect(exists('agentEnrollmentFlyout')).toBe(true);
        expect(exists('agent-policy-selection-step')).toBe(true);
        expect(exists('agent-enrollment-key-selection-step')).toBe(false);
      });

      describe('with a specific policy', () => {
        beforeEach(() => {
          jest.clearAllMocks();
          act(() => {
            testBed = setup({
              agentPolicy: testAgentPolicy,
              onClose: jest.fn(),
            });
            testBed.component.update();
          });
        });

        it('does not use either of the agent policy selection or enrollment key steps', () => {
          const { exists, actions } = testBed;
          jest.clearAllMocks();

          actions.goToStandaloneTab();

          expect(exists('agentEnrollmentFlyout')).toBe(true);
          expect(exists('agent-policy-selection-step')).toBe(false);
          expect(exists('agent-enrollment-key-selection-step')).toBe(false);
        });
      });
    });
  });
});
