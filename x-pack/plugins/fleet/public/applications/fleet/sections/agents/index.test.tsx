/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

// import type { Output } from '../../../../types';
import { createFleetTestRendererMock } from '../../../../mock';
import { useFleetStatus } from '../../../../hooks/use_fleet_status';
import { useGetSettings } from '../../../../hooks/use_request/settings';
import { useAuthz } from '../../../../hooks/use_authz';

import { AgentsApp } from '.';

// jest.mock('');

jest.mock('../../../../hooks/use_fleet_status', () => ({
  FleetStatusProvider: (props: any) => {
    return props.children;
  },
  useFleetStatus: jest.fn().mockReturnValue({}),
}));
jest.mock('../../../../hooks/use_request/settings');
jest.mock('../../../../hooks/use_authz');
jest.mock('./agent_requirements_page', () => {
  return {
    FleetServerRequirementPage: () => <>FleetServerRequirementPage</>,
    MissingESRequirementsPage: () => <>MissingESRequirementsPage</>,
  };
});
jest.mock('./agent_list_page', () => {
  return {
    AgentListPage: () => <>AgentListPage</>,
  };
});

const mockedUsedFleetStatus = useFleetStatus as jest.MockedFunction<typeof useFleetStatus>;
const mockedUseGetSettings = useGetSettings as jest.MockedFunction<typeof useGetSettings>;
const mockedUseAuthz = useAuthz as jest.MockedFunction<typeof useAuthz>;

function renderAgentsApp() {
  const renderer = createFleetTestRendererMock();
  renderer.mountHistory.push('/agents');

  const utils = renderer.render(<AgentsApp />);

  return { utils };
}
describe('AgentApp', () => {
  beforeEach(() => {
    mockedUseGetSettings.mockReturnValue({
      isLoading: false,
      data: {
        item: {
          has_seen_fleet_migration_notice: true,
        },
      },
    } as any);
    mockedUseAuthz.mockReturnValue({
      fleet: {
        all: true,
      },
    } as any);
  });

  it('should render the loading component if the status is loading', async () => {
    mockedUsedFleetStatus.mockReturnValue({
      isLoading: true,
      enabled: true,
      isReady: false,
      refresh: async () => {},
    });
    const { utils } = renderAgentsApp();

    expect(utils.container.querySelector('[data-test-subj=loadingSpinner]')).not.toBeNull();
  });

  it('should render the missing requirement component if the status contains missing requirement', async () => {
    mockedUsedFleetStatus.mockReturnValue({
      isLoading: false,
      enabled: true,
      isReady: false,
      missingRequirements: ['api_keys'],
      refresh: async () => {},
    });
    const { utils } = renderAgentsApp();
    expect(utils.queryByText('MissingESRequirementsPage')).not.toBeNull();
    expect(utils.queryByText('AgentListPage')).toBeNull();
  });

  it('should render the FleetServerRequirementPage if the status contains only fleet server missing requirement', async () => {
    mockedUsedFleetStatus.mockReturnValue({
      isLoading: false,
      enabled: true,
      isReady: false,
      missingRequirements: ['fleet_server'],
      refresh: async () => {},
    });
    const { utils } = renderAgentsApp();
    expect(utils.queryByText('FleetServerRequirementPage')).not.toBeNull();
    expect(utils.queryByText('AgentListPage')).toBeNull();
  });

  it('should render the App if there is no missing requirements and optionnal requirements', async () => {
    mockedUsedFleetStatus.mockReturnValue({
      isLoading: false,
      enabled: true,
      isReady: false,
      missingRequirements: [],
      missingOptionalFeatures: ['encrypted_saved_object_encryption_key_required'],
      refresh: async () => {},
    });
    const { utils } = renderAgentsApp();

    expect(utils.queryByText('AgentListPage')).not.toBeNull();
  });
});
