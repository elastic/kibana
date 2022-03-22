/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../hooks', () => {
  return {
    ...jest.requireActual('../../hooks'),
    useAgentEnrollmentFlyoutData: jest.fn(),
  };
});

jest.mock('../../hooks/use_request', () => {
  const module = jest.requireActual('../../hooks/use_request');
  return {
    ...module,
    useGetSettings: jest.fn(),
    sendGetFleetStatus: jest.fn(),
    sendGetOneAgentPolicy: jest.fn(),
    useGetAgents: jest.fn(),
    useGetAgentPolicies: jest.fn(),
  };
});

jest.mock(
  '../../applications/fleet/components/fleet_server_instructions/hooks/use_advanced_form',
  () => {
    const module = jest.requireActual(
      '../../applications/fleet/components/fleet_server_instructions/hooks/use_advanced_form'
    );
    return {
      ...module,
      useFleetServerInstructions: jest.fn(),
    };
  }
);

jest.mock(
  '../../applications/fleet/sections/agents/agent_requirements_page/fleet_server_requirement_page',
  () => {
    const module = jest.requireActual(
      '../../applications/fleet/sections/agents/agent_requirements_page/fleet_server_requirement_page'
    );
    return {
      ...module,
      FleetServerRequirementPage: jest.fn(),
    };
  }
);

/**
 * These steps functions use hooks inside useMemo which is not compatible with jest currently
 */
jest.mock('./steps', () => {
  const module = jest.requireActual('./steps');
  return {
    ...module,
    AgentPolicySelectionStep: jest.fn(),
    AgentEnrollmentKeySelectionStep: jest.fn(),
    ViewDataStep: jest.fn(),
    DownloadStep: jest.fn(),
  };
});

jest.mock('@elastic/eui', () => {
  const module = jest.requireActual('@elastic/eui');
  return {
    ...module,
    EuiSteps: 'eui-steps',
  };
});

jest.mock('../../services', () => {
  return {
    ...jest.requireActual('../../services'),
    policyHasFleetServer: jest.fn().mockReturnValue(true),
  };
});
