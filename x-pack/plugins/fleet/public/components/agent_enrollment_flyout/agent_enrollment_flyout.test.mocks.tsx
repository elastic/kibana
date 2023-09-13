/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
// TODO(jbudz): should be removed when upgrading to TS@4.8
// this is a skip for the errors created when typechecking with isolatedModules
export {};

jest.mock('../../hooks', () => {
  return {
    ...jest.requireActual('../../hooks'),
    useFleetServerStandalone: jest.fn(),
    useAgentEnrollmentFlyoutData: jest.fn(),
    useAgentVersion: jest.fn().mockReturnValue('8.1.0'),
  };
});

jest.mock('../../hooks/use_request', () => {
  const module = jest.requireActual('../../hooks/use_request');
  return {
    ...module,
    useGetFleetServerHosts: jest.fn().mockReturnValue({
      data: {
        items: [
          {
            is_default: true,
            host_urls: ['http://test.fr'],
          },
        ],
      },
    }),
    useGetFleetProxies: jest.fn().mockReturnValue({
      data: { items: [] },
      isLoading: false,
      isInitialRequest: false,
    }),
    useGetSettings: jest.fn().mockReturnValue({
      data: { item: { fleet_server_hosts: ['test'] } },
    }),
    sendGetOneAgentPolicy: jest.fn().mockResolvedValue({
      data: { item: { package_policies: [] } },
    }),
    useGetAgents: jest.fn().mockReturnValue({
      data: { items: [{ policy_id: 'fleet-server-policy' }] },
    }),
    useGetAgentPolicies: jest.fn(),
  };
});

jest.mock('../../applications/fleet/sections/agents/hooks/use_fleet_server_unhealthy', () => {
  const module = jest.requireActual(
    '../../applications/fleet/sections/agents/hooks/use_fleet_server_unhealthy'
  );
  return {
    ...module,
    useFleetServerUnhealthy: jest.fn(),
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
      title: 'agent-policy-selection-step',
      children: <>TEST</>,
    }),
    AgentEnrollmentKeySelectionStep: jest.fn().mockReturnValue({
      'data-test-subj': 'agent-enrollment-key-selection-step',
      title: 'agent-enrollment-key-selection-step',
      children: <>TEST</>,
    }),
    ConfigureStandaloneAgentStep: jest.fn().mockReturnValue({
      'data-test-subj': 'configure-standalone-step',
      title: 'configure-standalone-step',
      children: <>TEST</>,
    }),
    DownloadStep: jest.fn().mockReturnValue({
      'data-test-subj': 'download-step',
      title: 'download-step',
      children: <>TEST</>,
    }),
    IncomingDataConfirmationStep: jest.fn().mockReturnValue({
      'data-test-subj': 'incoming-data-confirmation-step',
      title: 'incoming-data-confirmation-step',
      children: <>TEST</>,
    }),
  };
});

jest.mock('../../../common/services/agent_policies_helpers', () => {
  return {
    policyHasFleetServer: jest.fn().mockReturnValue(true),
  };
});
