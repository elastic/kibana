/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import './agent_enrollment_flyout.test.mocks';

import React from 'react';
import { registerTestBed } from '@kbn/test/jest';
import { act } from '@testing-library/react';

import { coreMock } from 'src/core/public/mocks';

import { KibanaContextProvider } from '../../../../../../src/plugins/kibana_react/public';

import type { AgentPolicy } from '../../../common';
import { useGetSettings, sendGetFleetStatus } from '../../hooks/use_request';
import { FleetStatusProvider, ConfigContext } from '../../hooks';

import { useFleetServerInstructions } from '../../applications/fleet/sections/agents/agent_requirements_page/components';

import { AgentEnrollmentKeySelectionStep, AgentPolicySelectionStep } from './steps';

import type { Props } from '.';
import { AgentEnrollmentFlyout } from '.';

const TestComponent = (props: Props) => (
  <KibanaContextProvider services={coreMock.createStart()}>
    <ConfigContext.Provider value={{ agents: { enabled: true, elasticsearch: {} }, enabled: true }}>
      <FleetStatusProvider>
        <AgentEnrollmentFlyout {...props} />
      </FleetStatusProvider>
    </ConfigContext.Provider>
  </KibanaContextProvider>
);

const setup = async (props?: Props) => {
  const testBed = await registerTestBed(TestComponent)(props);
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

  beforeEach(async () => {
    (useGetSettings as jest.Mock).mockReturnValue({
      data: { item: { fleet_server_hosts: ['test'] } },
    });

    (sendGetFleetStatus as jest.Mock).mockResolvedValue({
      data: { isReady: true },
    });

    (useFleetServerInstructions as jest.Mock).mockReturnValue({
      serviceToken: 'test',
      getServiceToken: jest.fn(),
      isLoadingServiceToken: false,
      installCommand: jest.fn(),
      platform: 'test',
      setPlatform: jest.fn(),
    });

    await act(async () => {
      testBed = await setup({
        agentPolicies: [],
        onClose: jest.fn(),
      });
      testBed.component.update();
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('managed instructions', () => {
    it('uses the agent policy selection step', async () => {
      const { exists } = testBed;
      expect(exists('agentEnrollmentFlyout')).toBe(true);
      expect(AgentPolicySelectionStep).toHaveBeenCalled();
      expect(AgentEnrollmentKeySelectionStep).not.toHaveBeenCalled();
    });

    describe('with a specific policy', () => {
      beforeEach(async () => {
        jest.clearAllMocks();
        await act(async () => {
          testBed = await setup({
            agentPolicy: testAgentPolicy,
            onClose: jest.fn(),
          });
          testBed.component.update();
        });
      });

      it('uses the configure enrollment step, not the agent policy selection step', () => {
        const { exists } = testBed;
        expect(exists('agentEnrollmentFlyout')).toBe(true);
        expect(AgentPolicySelectionStep).not.toHaveBeenCalled();
        expect(AgentEnrollmentKeySelectionStep).toHaveBeenCalled();
      });
    });

    // Skipped due to implementation details in the step components. See https://github.com/elastic/kibana/issues/103894
    describe.skip('"View data" extension point', () => {
      it('shows the "View data" step when UI extension is provided', async () => {
        jest.clearAllMocks();
        await act(async () => {
          testBed = await setup({
            agentPolicies: [],
            onClose: jest.fn(),
            viewDataStep: { title: 'View Data', children: <div /> },
          });
          testBed.component.update();
        });
        const { exists, actions } = testBed;
        expect(exists('agentEnrollmentFlyout')).toBe(true);
        expect(exists('view-data-step')).toBe(true);

        jest.clearAllMocks();
        actions.goToStandaloneTab();
        expect(exists('agentEnrollmentFlyout')).toBe(true);
        expect(exists('view-data-step')).toBe(false);
      });

      it('does not call the "View data" step when UI extension is not provided', async () => {
        jest.clearAllMocks();
        await act(async () => {
          testBed = await setup({
            agentPolicies: [],
            onClose: jest.fn(),
            viewDataStep: undefined,
          });
          testBed.component.update();
        });
        const { exists, actions } = testBed;
        expect(exists('agentEnrollmentFlyout')).toBe(true);
        expect(exists('view-data-step')).toBe(false);

        jest.clearAllMocks();
        actions.goToStandaloneTab();
        expect(exists('view-data-step')).toBe(false);
      });
    });
  });

  describe('standalone instructions', () => {
    it('uses the agent policy selection step', async () => {
      const { exists, actions } = testBed;
      actions.goToStandaloneTab();
      expect(exists('agentEnrollmentFlyout')).toBe(true);
      expect(AgentPolicySelectionStep).toHaveBeenCalled();
      expect(AgentEnrollmentKeySelectionStep).not.toHaveBeenCalled();
    });

    describe('with a specific policy', () => {
      beforeEach(async () => {
        jest.clearAllMocks();
        await act(async () => {
          testBed = await setup({
            agentPolicy: testAgentPolicy,
            onClose: jest.fn(),
          });
          testBed.component.update();
        });
      });

      it('does not use either of the agent policy selection or enrollment key steps', () => {
        const { exists, actions } = testBed;
        jest.clearAllMocks();
        expect(exists('agentEnrollmentFlyout')).toBe(true);
        actions.goToStandaloneTab();
        expect(AgentPolicySelectionStep).not.toHaveBeenCalled();
        expect(AgentEnrollmentKeySelectionStep).not.toHaveBeenCalled();
      });
    });
  });
});
