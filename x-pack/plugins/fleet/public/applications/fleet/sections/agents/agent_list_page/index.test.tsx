/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import type { RenderResult } from '@testing-library/react';
import { act, fireEvent, waitFor } from '@testing-library/react';

import type { GetAgentPoliciesResponse } from '../../../../../../common';
import { createFleetTestRendererMock } from '../../../../../mock';
import { sendGetAgents, sendGetAgentStatus } from '../../../hooks';

import { AgentListPage } from '.';

jest.mock('../../../../integrations/hooks/use_confirm_force_install', () => ({
  useConfirmForceInstall: () => <>confirmForceInstall</>,
}));

jest.mock('./hooks/use_missing_encryption_key_callout', () => ({
  useMissingEncryptionKeyCallout: jest.fn().mockReturnValue([true, jest.fn()]),
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
    data: {
      items: [
        { id: 'policy1', is_managed: false },
        { id: 'managed_policy', is_managed: true },
      ],
    } as GetAgentPoliciesResponse,
    isLoading: false,
    resendRequest: jest.fn(),
  }),
  FleetStatusProvider: (props: any) => {
    return props.children;
  },
  useFleetStatus: jest.fn().mockReturnValue({}),
  sendGetAgentStatus: jest.fn(),
  sendGetAgentPolicies: jest.fn().mockResolvedValue({ data: { items: [] } }),
  sendGetAgentTags: jest.fn().mockReturnValue({ data: { items: ['tag1', 'tag2'] } }),
  useAuthz: jest
    .fn()
    .mockReturnValue({ fleet: { all: true, allAgents: true, readAgents: true }, integrations: {} }),
  useStartServices: jest.fn().mockReturnValue({
    notifications: {
      toasts: {
        addError: jest.fn(),
      },
    },
    cloud: {},
    data: { dataViews: { getFieldsForWildcard: jest.fn() } },
    docLinks: { links: { kibana: { secureSavedObject: 'my-link' } } },
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

  describe('handling slow agent status request', () => {
    beforeEach(async () => {
      mockedSendGetAgents
        .mockResolvedValueOnce({
          data: {
            items: mapAgents(['agent1', 'agent2', 'agent3', 'agent4', 'agent5']),
            total: 6,
            statusSummary: {
              online: 6,
            },
          },
        })
        .mockResolvedValueOnce({
          data: {
            items: mapAgents(['agent1', 'agent2', 'agent3', 'agent4', 'agent6']),
            total: 6,
            statusSummary: {
              online: 6,
            },
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
              inactive: 0,
            },
          },
        };
      });
      ({ utils } = renderAgentList());

      act(() => {
        jest.advanceTimersByTime(65000);
      });

      expect(mockedSendGetAgentStatus).toHaveBeenCalledTimes(1);
    });
  });

  describe('selection change', () => {
    beforeEach(async () => {
      mockedSendGetAgents.mockResolvedValue({
        data: {
          items: mapAgents(['agent1', 'agent2', 'agent3', 'agent4', 'agent6']),
          total: 6,
          statusSummary: {
            online: 6,
          },
        },
      });
      mockedSendGetAgentStatus.mockResolvedValue({
        data: {
          results: {
            inactive: 0,
          },
          totalInactive: 0,
        },
      });
      ({ utils } = renderAgentList());

      await waitFor(() => {
        expect(utils.getByText('Showing 6 agents')).toBeInTheDocument();
      });

      const selectAll = utils.container.querySelector('[data-test-subj="checkboxSelectAll"]');
      fireEvent.click(selectAll!);

      await waitFor(() => {
        utils.getByText('5 agents selected');
      });

      fireEvent.click(utils.getByText('Select everything on all pages'));
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
      fireEvent.click(utils.getAllByRole('checkbox')[3]);

      utils.getByText('4 agents selected');
    });

    it('should pass sort parameters on table sort', () => {
      fireEvent.click(utils.getByTitle('Last activity'));

      expect(mockedSendGetAgents).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'last_checkin',
          sortOrder: 'asc',
        })
      );
    });

    it('should pass keyword field on table sort on version', () => {
      fireEvent.click(utils.getByTitle('Version'));

      expect(mockedSendGetAgents).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'local_metadata.elastic.agent.version.keyword',
          sortOrder: 'asc',
        })
      );
    });

    it('should pass keyword field on table sort on hostname', () => {
      fireEvent.click(utils.getByTitle('Host'));

      expect(mockedSendGetAgents).toHaveBeenCalledWith(
        expect.objectContaining({
          sortField: 'local_metadata.host.hostname.keyword',
          sortOrder: 'asc',
        })
      );
    });
  });

  describe('Uninstall agent', () => {
    let renderResult: RenderResult;

    beforeEach(async () => {
      mockedSendGetAgents.mockResolvedValue({
        data: {
          items: [
            {
              id: 'agent1',
              active: true,
              policy_id: 'policy1',
              local_metadata: { host: { hostname: 'agent1' } },
            },
            {
              id: 'agent2',
              active: true,
              policy_id: 'managed_policy',
              local_metadata: { host: { hostname: 'agent2' } },
            },
          ],
          total: 2,
          statusSummary: {
            online: 2,
          },
        },
      });
      mockedSendGetAgentStatus.mockResolvedValue({
        data: { results: { inactive: 0 }, totalInactive: 0 },
      });

      const renderer = createFleetTestRendererMock();

      renderResult = renderer.render(<AgentListPage />);

      await waitFor(() => {
        expect(renderResult.queryByText('Showing 2 agents')).toBeInTheDocument();
      });
    });

    it('should not render "Uninstall agent" menu item for managed Agent', async () => {
      expect(renderResult.queryByTestId('uninstallAgentMenuItem')).not.toBeInTheDocument();

      fireEvent.click(renderResult.getAllByTestId('agentActionsBtn')[1]);

      expect(renderResult.queryByTestId('uninstallAgentMenuItem')).not.toBeInTheDocument();
    });

    it('should render "Uninstall agent" menu item for not managed Agent', async () => {
      expect(renderResult.queryByTestId('uninstallAgentMenuItem')).not.toBeInTheDocument();

      fireEvent.click(renderResult.getAllByTestId('agentActionsBtn')[0]);

      expect(renderResult.queryByTestId('uninstallAgentMenuItem')).toBeInTheDocument();
    });

    it('should open uninstall commands flyout when clicking on "Uninstall agent"', () => {
      fireEvent.click(renderResult.getAllByTestId('agentActionsBtn')[0]);
      expect(renderResult.queryByTestId('uninstall-command-flyout')).not.toBeInTheDocument();

      fireEvent.click(renderResult.getByTestId('uninstallAgentMenuItem'));

      expect(renderResult.queryByTestId('uninstall-command-flyout')).toBeInTheDocument();
    });
  });
});
