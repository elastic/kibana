/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { createFleetTestRendererMock } from '../../../../../../mock';
import type { Agent, AgentPolicy } from '../../../../types';
import { useGetPackageInfoByKeyQuery } from '../../../../../../hooks/use_request/epm';

import { AgentDashboardLink } from './agent_dashboard_link';

const mockedUseGetPackageInfoByKeyQuery = useGetPackageInfoByKeyQuery as jest.MockedFunction<
  typeof useGetPackageInfoByKeyQuery
>;

jest.mock('../../../../../../hooks/use_fleet_status', () => ({
  FleetStatusProvider: (props: any) => {
    return props.children;
  },
}));

jest.mock('../../../../../../hooks/use_request/epm');

describe('AgentDashboardLink', () => {
  it('should enable the button if elastic_agent package is installed and policy has monitoring enabled', async () => {
    mockedUseGetPackageInfoByKeyQuery.mockReturnValue({
      isLoading: false,
      data: {
        item: {
          status: 'installed',
        },
      },
    } as ReturnType<typeof useGetPackageInfoByKeyQuery>);
    const testRenderer = createFleetTestRendererMock();

    const result = testRenderer.render(
      <AgentDashboardLink
        agent={
          {
            id: 'agent-id-123',
          } as unknown as Agent
        }
        agentPolicy={
          {
            monitoring_enabled: ['logs', 'metrics'],
          } as unknown as AgentPolicy
        }
      />
    );

    expect(result.queryByRole('link')).not.toBeNull();
    expect(result.getByRole('link').hasAttribute('href')).toBeTruthy();
  });

  it('should not enable the button if elastic_agent package is not installed and policy has monitoring enabled', async () => {
    mockedUseGetPackageInfoByKeyQuery.mockReturnValue({
      isLoading: false,
      data: {
        item: {
          status: 'not_installed',
        },
      },
    } as ReturnType<typeof useGetPackageInfoByKeyQuery>);
    const testRenderer = createFleetTestRendererMock();

    const result = testRenderer.render(
      <AgentDashboardLink
        agent={
          {
            id: 'agent-id-123',
          } as unknown as Agent
        }
        agentPolicy={
          {
            monitoring_enabled: ['logs', 'metrics'],
          } as unknown as AgentPolicy
        }
      />
    );

    expect(result.queryByRole('link')).toBeNull();
    expect(result.queryByRole('button')).not.toBeNull();
    expect(result.getByRole('button').hasAttribute('disabled')).toBeTruthy();
  });

  it('should link to the agent policy settings tab if logs and metrics are not enabled for that policy', async () => {
    mockedUseGetPackageInfoByKeyQuery.mockReturnValue({
      isLoading: false,
      data: {
        item: {
          status: 'installed',
        },
      },
    } as ReturnType<typeof useGetPackageInfoByKeyQuery>);
    const testRenderer = createFleetTestRendererMock();

    const result = testRenderer.render(
      <AgentDashboardLink
        agent={
          {
            id: 'agent-id-123',
          } as unknown as Agent
        }
        agentPolicy={
          {
            id: 'policy123',
            monitoring_enabled: [],
          } as unknown as AgentPolicy
        }
      />
    );

    const link = result.queryByRole('link');
    expect(link).not.toBeNull();
    expect(link?.getAttribute('href')).toBe('/mock/app/fleet/policies/policy123/settings');
  });
});
