/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { RenderResult } from '@testing-library/react';
import { act, fireEvent, waitFor } from '@testing-library/react';

import { createFleetTestRendererMock } from '../../../../../mock';

import { sendGetAgents, sendGetAgentStatus } from '../../../hooks';

import { AgentListPage } from '.';

jest.mock('../../../../integrations/hooks/use_confirm_force_install', () => ({
  useConfirmForceInstall: () => <>confirmForceInstall</>,
}));
jest.mock('../../../hooks', () => ({
  ...jest.requireActual('../../../hooks'),
  UIExtensionsContext: {
    Provider: (props: any) => {
      return props.children;
    },
  },
  sendGetAgents: jest.fn(),
  useGetAgentPolicies: jest.fn().mockReturnValue({
    data: { items: [{ id: 'policy1' }] },
    isLoading: false,
    resendRequest: jest.fn(),
  }),
  FleetStatusProvider: (props: any) => {
    return props.children;
  },
  useFleetStatus: jest.fn().mockReturnValue({}),
  sendGetAgentStatus: jest.fn(),
  sendGetAgentTags: jest.fn().mockReturnValue({ data: { items: ['tag1', 'tag2'] } }),
  useAuthz: jest.fn().mockReturnValue({ fleet: { all: true } }),
  useStartServices: jest.fn().mockReturnValue({
    notifications: {
      toasts: {
        addError: jest.fn(),
      },
    },
    cloud: {},
    data: { dataViews: { getFieldsForWildcard: jest.fn() } },
  }),
  useBreadcrumbs: jest.fn(),
  useLink: jest.fn().mockReturnValue({ getHref: jest.fn() }),
  useUrlParams: jest.fn().mockReturnValue({ urlParams: { kuery: '' } }),
  useKibanaVersion: jest.fn().mockReturnValue('8.3.0'),
  usePagination: jest.fn().mockReturnValue({
    pagination: {
      currentPage: 1,
      pageSize: 5,
    },
    pageSizeOptions: [5, 20, 50],
    setPagination: jest.fn(),
  }),
  useFleetServerUnhealthy: jest.fn().mockReturnValue({
    isUnhealthy: false,
    isLoading: false,
  }),
}));

jest.mock('./components/search_and_filter_bar', () => {
  return {
    SearchAndFilterBar: () => <>SearchAndFilterBar</>,
  };
});

const mockedSendGetAgents = sendGetAgents as jest.Mock;
const mockedSendGetAgentStatus = sendGetAgentStatus as jest.Mock;

function renderAgentList() {
  const renderer = createFleetTestRendererMock();

  const utils = renderer.render(<AgentListPage />);

  return { utils };
}

describe('agent_list_page', () => {
  const mapAgents = (ids: string[]) =>
    ids.map((agent) => ({
      id: agent,
      active: true,
      policy_id: 'policy1',
      local_metadata: { host: { hostname: agent } },
    }));

  let utils: RenderResult;

  beforeEach(async () => {
    mockedSendGetAgents
      .mockResolvedValueOnce({
        data: {
          items: mapAgents(['agent1', 'agent2', 'agent3', 'agent4', 'agent5']),
          total: 6,
          totalInactive: 0,
        },
      })
      .mockResolvedValueOnce({
        data: {
          items: mapAgents(['agent1', 'agent2', 'agent3', 'agent4', 'agent6']),
          total: 6,
          totalInactive: 0,
        },
      });
    jest.useFakeTimers({ legacyFakeTimers: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should not send another agents status request if first one takes longer', () => {
    mockedSendGetAgentStatus.mockImplementation(async () => {
      const sleep = () => {
        return new Promise((res) => {
          setTimeout(() => res({}), 35000);
        });
      };
      await sleep();
      return {
        data: {
          results: {
            online: 6,
            error: 0,
            offline: 0,
            updating: 0,
          },
          totalInactive: 0,
        },
      };
    });
    ({ utils } = renderAgentList());

    act(() => {
      jest.advanceTimersByTime(65000);
    });

    expect(mockedSendGetAgentStatus).toHaveBeenCalledTimes(1);
  });

  describe('selection change', () => {
    beforeEach(async () => {
      mockedSendGetAgentStatus.mockResolvedValue({
        data: {
          results: {
            online: 6,
            error: 0,
            offline: 0,
            updating: 0,
          },
          totalInactive: 0,
        },
      });
      ({ utils } = renderAgentList());

      await waitFor(() => {
        expect(utils.getByText('Showing 6 agents')).toBeInTheDocument();
      });

      act(() => {
        const selectAll = utils.container.querySelector('[data-test-subj="checkboxSelectAll"]');
        fireEvent.click(selectAll!);
      });

      await waitFor(() => {
        utils.getByText('5 agents selected');
      });

      act(() => {
        fireEvent.click(utils.getByText('Select everything on all pages'));
      });
      utils.getByText('All agents selected');
    });

    it('should not set selection mode when agent selection changed automatically', async () => {
      act(() => {
        jest.runOnlyPendingTimers();
      });

      await waitFor(() => {
        expect(utils.getByText('agent6')).toBeInTheDocument();
      });

      utils.getByText('All agents selected');

      expect(
        utils
          .getByText('agent6')
          .closest('tr')!
          .getAttribute('class')!
          .includes('euiTableRow-isSelected')
      ).toBeTruthy();
    });

    it('should set selection mode when agent selection changed manually', async () => {
      act(() => {
        fireEvent.click(utils.getAllByRole('checkbox')[3]);
      });

      utils.getByText('4 agents selected');
    });

    it('should pass sort parameters on table sort', () => {
      act(() => {
        fireEvent.click(utils.getByTitle('Last activity'));
      });

      expect(mockedSendGetAgents).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'last_checkin',
          sortOrder: 'asc',
        })
      );
    });

    it('should pass keyword field on table sort on version', () => {
      act(() => {
        fireEvent.click(utils.getByTitle('Version'));
      });

      expect(mockedSendGetAgents).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'local_metadata.elastic.agent.version.keyword',
          sortOrder: 'asc',
        })
      );
    });

    it('should pass keyword field on table sort on hostname', () => {
      act(() => {
        fireEvent.click(utils.getByTitle('Host'));
      });

      expect(mockedSendGetAgents).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'local_metadata.host.hostname.keyword',
          sortOrder: 'asc',
        })
      );
    });
  });
});
