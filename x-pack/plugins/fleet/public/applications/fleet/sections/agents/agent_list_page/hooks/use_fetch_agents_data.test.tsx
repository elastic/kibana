/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';

import { useStartServices } from '../../../../hooks';

import { ExperimentalFeaturesService } from '../../../../services';

import { useFetchAgentsData } from './use_fetch_agents_data';

jest.mock('../../../../../../services/experimental_features');
const mockedExperimentalFeaturesService = jest.mocked(ExperimentalFeaturesService);

jest.mock('../../../../hooks', () => ({
  ...jest.requireActual('../../../../hooks'),
  sendGetAgents: jest.fn().mockResolvedValue({
    data: {
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
  useUrlParams: jest.fn().mockReturnValue({ urlParams: { kuery: '' } }),
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
    let result: any | undefined;
    let waitForNextUpdate: any | undefined;
    await act(async () => {
      ({ result, waitForNextUpdate } = renderHook(() => useFetchAgentsData()));
      await waitForNextUpdate();
    });

    expect(result?.current.selectedStatus).toEqual(['healthy', 'unhealthy', 'updating', 'offline']);
    expect(result?.current.agentPolicies).toEqual([
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
      'agent-policy-managed': {
        id: 'agent-policy-managed',
        managed: true,
        name: 'Managed Agent policy',
        namespace: 'default',
      },
    });
    expect(result?.current.kuery).toEqual(
      'status:online or (status:error or status:degraded) or (status:updating or status:unenrolling or status:enrolling) or status:offline'
    );
    expect(result?.current.currentRequestRef).toEqual({ current: 1 });
    expect(result?.current.pagination).toEqual({ currentPage: 1, pageSize: 5 });
    expect(result?.current.pageSizeOptions).toEqual([5, 20, 50]);
  });
});
