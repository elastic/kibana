/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../../hooks', () => {
  return {
    ...jest.requireActual('../../hooks'),
    useFleetStatus: jest.fn(),
    useAgentEnrollmentFlyoutData: jest.fn(),
  };
});

jest.mock('../../hooks/use_request', () => {
  const module = jest.requireActual('../../hooks/use_request');
  return {
    ...module,
    useGetSettings: jest.fn(),
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
      useAdvancedForm: jest.fn(),
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
    AgentPolicySelectionStep: jest.fn().mockReturnValue({
      'data-test-subj': 'agent-policy-selection-step',
    }),
    AgentEnrollmentKeySelectionStep: jest.fn().mockReturnValue({
      'data-test-subj': 'agent-enrollment-key-selection-step',
    }),
    ViewDataStep: jest.fn().mockReturnValue({ 'data-test-subj': 'view-data-step' }),
    DownloadStep: jest.fn().mockReturnValue({ 'data-test-subj': 'download-step' }),
  };
});

jest.mock('../../services', () => {
  return {
    ...jest.requireActual('../../services'),
    policyHasFleetServer: jest.fn().mockReturnValue(true),
  };
});
