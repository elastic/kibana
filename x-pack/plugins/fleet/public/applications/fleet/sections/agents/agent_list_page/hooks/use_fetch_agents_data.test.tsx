/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from '@testing-library/react-hooks';

import { useStartServices } from '../../../../hooks';

import { ExperimentalFeaturesService } from '../../../../services';
import { createFleetTestRendererMock } from '../../../../../../mock';

import { useFetchAgentsData } from './use_fetch_agents_data';

jest.mock('../../../../../../services/experimental_features');
const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);

jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
  sendGetAgents: jest.fn().mockResolvedValue({
    data: {
      statusSummary: {},
      items: [
        {
          id: 'agent123',
          policy_id: 'agent-policy-1',
        },
      ],
      total: 5,
    },
  }),
  sendGetAgentStatus: jest.fn().mockResolvedValue({
    data: {
      results: {
        inactive: 2,
      },
      totalInactive: 2,
    },
  }),
  sendBulkGetAgentPolicies: jest.fn().mockReturnValue({
    data: {
      items: [
        { id: 'agent-policy-1', name: 'Agent policy 1', namespace: 'default' },
        {
          id: 'agent-policy-managed',
          name: 'Managed Agent policy',
          namespace: 'default',
          managed: true,
        },
      ],
    },
  }),
  sendGetAgentPolicies: jest.fn().mockReturnValue({
    data: {
      items: [
        { id: 'agent-policy-1', name: 'Agent policy 1', namespace: 'default' },
        {
          id: 'agent-policy-managed',
          name: 'Managed Agent policy',
          namespace: 'default',
          managed: true,
        },
      ],
    },
  }),
  useGetAgentPolicies: jest.fn().mockReturnValue({
    data: {
      items: [
        { id: 'agent-policy-1', name: 'Agent policy 1', namespace: 'default' },
        {
          id: 'agent-policy-managed',
          name: 'Managed Agent policy',
          namespace: 'default',
          managed: true,
        },
      ],
    },
    error: undefined,
    isLoading: false,
    resendRequest: jest.fn(),
  } as any),
  sendGetAgentTags: jest.fn().mockReturnValue({ data: { items: ['tag1', 'tag2'] } }),
  useStartServices: jest.fn().mockReturnValue({
    notifications: {
      toasts: {
        addError: jest.fn(),
      },
    },
    cloud: {},
    data: { dataViews: { getFieldsForWildcard: jest.fn() } },
  }),
  usePagination: jest.fn().mockReturnValue({
    pagination: {
      currentPage: 1,
      pageSize: 5,
    },
    pageSizeOptions: [5, 20, 50],
    setPagination: jest.fn(),
  }),
}));

describe('useFetchAgentsData', () => {
  const startServices = useStartServices();
  const mockErrorToast = startServices.notifications.toasts.addError as jest.Mock;

  beforeAll(() => {
    mockedExperimentalFeaturesService.get.mockReturnValue({
      displayAgentMetrics: true,
    } as any);
  });

  beforeEach(() => {
    mockErrorToast.mockReset();
    mockErrorToast.mockResolvedValue({});
  });

  it('should fetch agents and agent policies data', async () => {
    const renderer = createFleetTestRendererMock();
    const { result, waitForNextUpdate } = renderer.renderHook(() => useFetchAgentsData());
    await act(async () => {
      await waitForNextUpdate();
    });

    expect(result?.current.selectedStatus).toEqual(['healthy', 'unhealthy', 'updating', 'offline']);
    expect(result?.current.allAgentPolicies).toEqual([
      {
        id: 'agent-policy-1',
        name: 'Agent policy 1',
        namespace: 'default',
      },
      {
        id: 'agent-policy-managed',
        managed: true,
        name: 'Managed Agent policy',
        namespace: 'default',
      },
    ]);

    expect(result?.current.agentPoliciesIndexedById).toEqual({
      'agent-policy-1': {
        id: 'agent-policy-1',
        name: 'Agent policy 1',
        namespace: 'default',
      },
    });
    expect(result?.current.kuery).toEqual(
      'status:online or (status:error or status:degraded) or (status:updating or status:unenrolling or status:enrolling) or status:offline'
    );
    expect(result?.current.currentRequestRef).toEqual({ current: 2 });
    expect(result?.current.pagination).toEqual({ currentPage: 1, pageSize: 5 });
    expect(result?.current.pageSizeOptions).toEqual([5, 20, 50]);
  });

  it('sync querystring kuery with current search', async () => {
    const renderer = createFleetTestRendererMock();
    const { result, waitForNextUpdate } = renderer.renderHook(() => useFetchAgentsData());
    await act(async () => {
      await waitForNextUpdate();
    });

    expect(renderer.history.location.search).toEqual('');

    // Set search
    await act(async () => {
      result.current.setSearch('active:true');
      await waitForNextUpdate();
    });

    expect(renderer.history.location.search).toEqual('?kuery=active%3Atrue');

    // Clear search
    await act(async () => {
      result.current.setSearch('');
      await waitForNextUpdate();
    });

    expect(renderer.history.location.search).toEqual('');
  });
});
