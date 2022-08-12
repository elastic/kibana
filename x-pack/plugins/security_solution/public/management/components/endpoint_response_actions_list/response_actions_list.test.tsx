/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import type { AppContextTestRender } from '../../../common/mock/endpoint';
import { createAppRootMockRenderer } from '../../../common/mock/endpoint';
import { ResponseActionsList } from './response_actions_list';
import type { ActionDetails, ActionListApiResponse } from '../../../../common/endpoint/types';
import { MANAGEMENT_PATH } from '../../../../common/constants';
import { EndpointActionGenerator } from '../../../../common/endpoint/data_generators/endpoint_action_generator';

let mockUseGetEndpointActionList: {
  isFetched?: boolean;
  isFetching?: boolean;
  error?: null;
  data?: ActionListApiResponse;
  refetch: () => unknown;
};
jest.mock('../../hooks/endpoint/use_get_endpoint_action_list', () => {
  const original = jest.requireActual('../../hooks/endpoint/use_get_endpoint_action_list');
  return {
    ...original,
    useGetEndpointActionList: () => mockUseGetEndpointActionList,
  };
});

jest.mock('@kbn/kibana-react-plugin/public', () => {
  const original = jest.requireActual('@kbn/kibana-react-plugin/public');
  return {
    ...original,
    useKibana: () => ({
      services: {
        uiSettings: {
          get: jest.fn().mockImplementation((key) => {
            const get = (k: 'dateFormat' | 'timepicker:quickRanges') => {
              const x = {
                dateFormat: 'MMM D, YYYY @ HH:mm:ss.SSS',
                'timepicker:quickRanges': [
                  {
                    from: 'now/d',
                    to: 'now/d',
                    display: 'Today',
                  },
                  {
                    from: 'now/w',
                    to: 'now/w',
                    display: 'This week',
                  },
                  {
                    from: 'now-15m',
                    to: 'now',
                    display: 'Last 15 minutes',
                  },
                  {
                    from: 'now-30m',
                    to: 'now',
                    display: 'Last 30 minutes',
                  },
                  {
                    from: 'now-1h',
                    to: 'now',
                    display: 'Last 1 hour',
                  },
                  {
                    from: 'now-24h',
                    to: 'now',
                    display: 'Last 24 hours',
                  },
                  {
                    from: 'now-7d',
                    to: 'now',
                    display: 'Last 7 days',
                  },
                  {
                    from: 'now-30d',
                    to: 'now',
                    display: 'Last 30 days',
                  },
                  {
                    from: 'now-90d',
                    to: 'now',
                    display: 'Last 90 days',
                  },
                  {
                    from: 'now-1y',
                    to: 'now',
                    display: 'Last 1 year',
                  },
                ],
              };
              return x[k];
            };
            return get(key);
          }),
        },
      },
    }),
  };
});

describe('Response Actions List', () => {
  const testPrefix = 'response-actions-list';

  let render: (
    props?: React.ComponentProps<typeof ResponseActionsList>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;

  const refetchFunction = jest.fn();
  const baseMockedActionList = {
    isFetched: true,
    isFetching: false,
    error: null,
    refetch: refetchFunction,
  };

  beforeEach(async () => {
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = (props?: React.ComponentProps<typeof ResponseActionsList>) =>
      (renderResult = mockedContext.render(<ResponseActionsList {...(props ?? {})} />));
    reactTestingLibrary.act(() => {
      history.push(`${MANAGEMENT_PATH}/response_actions`);
    });

    mockUseGetEndpointActionList = {
      ...baseMockedActionList,
      data: await getActionListMock({ actionCount: 13 }),
    };
  });

  afterEach(() => {
    mockUseGetEndpointActionList = {
      ...baseMockedActionList,
    };
    jest.clearAllMocks();
  });

  describe('Without data', () => {
    it('should show date filters', () => {
      render();
      expect(renderResult.getByTestId(`${testPrefix}-super-date-picker`)).toBeTruthy();
    });

    it('should show empty state when there is no data', async () => {
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data: await getActionListMock({ actionCount: 0 }),
      };
      render();
      expect(renderResult.getByTestId(`${testPrefix}-empty-prompt`)).toBeTruthy();
    });
  });

  describe('With Data', () => {
    it('should show table when there is data', async () => {
      render();

      expect(renderResult.getByTestId(`${testPrefix}-table-view`)).toBeTruthy();
      expect(renderResult.getByTestId(`${testPrefix}-endpointListTableTotal`)).toHaveTextContent(
        'Showing 1-10 of 13 response actions'
      );
    });

    it('should show expected column names on the table', async () => {
      render();

      expect(
        Array.from(
          renderResult.getByTestId(`${testPrefix}-table-view`).querySelectorAll('thead th')
        )
          .slice(0, 6)
          .map((col) => col.textContent)
      ).toEqual(['Time', 'Command', 'User', 'Host', 'Comments', 'Status']);
    });

    it('should paginate table when there is data', async () => {
      render();

      expect(renderResult.getByTestId(`${testPrefix}-table-view`)).toBeTruthy();
      expect(renderResult.getByTestId(`${testPrefix}-endpointListTableTotal`)).toHaveTextContent(
        'Showing 1-10 of 13 response actions'
      );

      const page2 = renderResult.getByTestId('pagination-button-1');
      userEvent.click(page2);
      expect(renderResult.getByTestId(`${testPrefix}-endpointListTableTotal`)).toHaveTextContent(
        'Showing 11-13 of 13 response actions'
      );
    });

    it('should update per page rows on the table', async () => {
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data: await getActionListMock({ actionCount: 33 }),
      };

      render();

      expect(renderResult.getByTestId(`${testPrefix}-table-view`)).toBeTruthy();
      expect(renderResult.getByTestId(`${testPrefix}-endpointListTableTotal`)).toHaveTextContent(
        'Showing 1-10 of 33 response actions'
      );

      // should have 4 pages each of size 10.
      expect(renderResult.getByTestId('pagination-button-0')).toHaveAttribute(
        'aria-label',
        'Page 1 of 4'
      );

      // toggle page size popover
      userEvent.click(renderResult.getByTestId('tablePaginationPopoverButton'));
      await waitForEuiPopoverOpen();
      // click size 20
      userEvent.click(renderResult.getByTestId('tablePagination-20-rows'));

      expect(renderResult.getByTestId(`${testPrefix}-endpointListTableTotal`)).toHaveTextContent(
        'Showing 1-20 of 33 response actions'
      );

      // should have only 2 pages each of size 20
      expect(renderResult.getByTestId('pagination-button-0')).toHaveAttribute(
        'aria-label',
        'Page 1 of 2'
      );
    });

    it('should show 1-1 record label when only 1 record', async () => {
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data: await getActionListMock({ actionCount: 1 }),
      };
      render();

      expect(renderResult.getByTestId(`${testPrefix}-endpointListTableTotal`)).toHaveTextContent(
        'Showing 1-1 of 1 response action'
      );
    });

    it('should expand each row to show details', async () => {
      render();

      const expandButtons = renderResult.getAllByTestId(`${testPrefix}-expand-button`);
      expandButtons.map((button) => userEvent.click(button));
      const trays = renderResult.getAllByTestId(`${testPrefix}-details-tray`);
      expect(trays).toBeTruthy();
      expect(trays.length).toEqual(13);

      expandButtons.map((button) => userEvent.click(button));
      const noTrays = renderResult.queryAllByTestId(`${testPrefix}-details-tray`);
      expect(noTrays).toEqual([]);
    });

    it('should refresh data when autoRefresh is toggled on', async () => {
      render();

      const quickMenuButton = renderResult.getByTestId('superDatePickerToggleQuickMenuButton');
      userEvent.click(quickMenuButton);
      await waitForEuiPopoverOpen();

      const toggle = renderResult.getByTestId('superDatePickerToggleRefreshButton');
      const intervalInput = renderResult.getByTestId('superDatePickerRefreshIntervalInput');

      userEvent.click(toggle);
      reactTestingLibrary.fireEvent.change(intervalInput, { target: { value: 1 } });

      await reactTestingLibrary.waitFor(() => {
        expect(refetchFunction).toHaveBeenCalledTimes(3);
      });
    });

    it('should refresh data when super date picker refresh button is clicked', async () => {
      render();

      const superRefreshButton = renderResult.getByTestId(
        `${testPrefix}-super-date-picker-refresh-button`
      );
      userEvent.click(superRefreshButton);
      expect(refetchFunction).toHaveBeenCalledTimes(1);
    });

    it('should set date picker with relative dates', async () => {
      render();
      const quickMenuButton = renderResult.getByTestId('superDatePickerToggleQuickMenuButton');
      const startDatePopoverButton = renderResult.getByTestId(`superDatePickerShowDatesButton`);

      // shows 24 hours at first
      expect(startDatePopoverButton).toHaveTextContent('Last 24 hours');

      // pick another relative date
      userEvent.click(quickMenuButton);
      await waitForEuiPopoverOpen();
      userEvent.click(renderResult.getByTestId('superDatePickerCommonlyUsed_Last_15 minutes'));
      expect(startDatePopoverButton).toHaveTextContent('Last 15 minutes');
    });
  });

  describe('Action status ', () => {
    const expandRows = () => {
      const expandButtons = renderResult.getAllByTestId(`${testPrefix}-expand-button`);
      expandButtons.map((button) => userEvent.click(button));
      const outputs = renderResult.getAllByTestId(`${testPrefix}-details-tray-output`);
      return outputs;
    };

    it('Shows completed status badge for successfully completed actions', async () => {
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data: await getActionListMock({ actionCount: 2 }),
      };
      render();

      const outputs = expandRows();
      expect(outputs.map((n) => n.textContent)).toEqual([
        'isolate completed successfully',
        'isolate completed successfully',
      ]);
      expect(
        renderResult.getAllByTestId(`${testPrefix}-column-status`).map((n) => n.textContent)
      ).toEqual(['Completed', 'Completed']);
    });

    it('shows Failed status badge for failed actions', async () => {
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data: await getActionListMock({ actionCount: 2, wasSuccessful: false }),
      };
      render();

      const outputs = expandRows();
      expect(outputs.map((n) => n.textContent)).toEqual(['isolate failed', 'isolate failed']);
      expect(
        renderResult.getAllByTestId(`${testPrefix}-column-status`).map((n) => n.textContent)
      ).toEqual(['Failed', 'Failed']);
    });

    it('shows Failed status badge for expired actions', async () => {
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data: await getActionListMock({ actionCount: 2, isCompleted: false, isExpired: true }),
      };
      render();

      const outputs = expandRows();
      expect(outputs.map((n) => n.textContent)).toEqual([
        'isolate failed: action expired',
        'isolate failed: action expired',
      ]);
      expect(
        renderResult.getAllByTestId(`${testPrefix}-column-status`).map((n) => n.textContent)
      ).toEqual(['Failed', 'Failed']);
    });

    it('shows Pending status badge for pending actions', async () => {
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data: await getActionListMock({ actionCount: 2, isCompleted: false }),
      };
      render();

      const outputs = expandRows();
      expect(outputs.map((n) => n.textContent)).toEqual([
        'isolate is pending',
        'isolate is pending',
      ]);
      expect(
        renderResult.getAllByTestId(`${testPrefix}-column-status`).map((n) => n.textContent)
      ).toEqual(['Pending', 'Pending']);
    });
  });

  describe('With agentIds filter', () => {
    it('should NOT show a host column when a single agentId', async () => {
      const agentIds = uuid.v4();
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data: await getActionListMock({ actionCount: 2, agentIds: [agentIds] }),
      };
      render({ agentIds });

      expect(
        Array.from(
          renderResult.getByTestId(`${testPrefix}-table-view`).querySelectorAll('thead th')
        )
          .slice(0, 5)
          .map((col) => col.textContent)
      ).toEqual(['Time', 'Command', 'User', 'Comments', 'Status']);
    });

    it('should show a host column when multiple agentIds', async () => {
      const agentIds = [uuid.v4(), uuid.v4()];
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data: await getActionListMock({ actionCount: 2, agentIds }),
      };
      render({ agentIds });

      expect(
        Array.from(
          renderResult.getByTestId(`${testPrefix}-table-view`).querySelectorAll('thead th')
        )
          .slice(0, 6)
          .map((col) => col.textContent)
      ).toEqual(['Time', 'Command', 'User', 'Host', 'Comments', 'Status']);
    });
  });
});

// mock API response
const getActionListMock = async ({
  agentIds: _agentIds,
  commands,
  actionCount = 0,
  endDate,
  page = 1,
  pageSize = 10,
  startDate,
  userIds,
  isCompleted = true,
  isExpired = false,
  wasSuccessful = true,
}: {
  agentIds?: string[];
  commands?: string[];
  actionCount?: number;
  endDate?: string;
  page?: number;
  pageSize?: number;
  startDate?: string;
  userIds?: string[];
  isCompleted?: boolean;
  isExpired?: boolean;
  wasSuccessful?: boolean;
}): Promise<ActionListApiResponse> => {
  const endpointActionGenerator = new EndpointActionGenerator('seed');

  const agentIds = _agentIds ?? [uuid.v4()];

  const data: ActionDetails[] = agentIds.map((id) => {
    const actionIds = Array(actionCount)
      .fill(1)
      .map(() => uuid.v4());

    const actionDetails: ActionDetails[] = actionIds.map((actionId) => {
      return endpointActionGenerator.generateActionDetails({
        agents: [id],
        id: actionId,
        isCompleted,
        isExpired,
        wasSuccessful,
        completedAt: isExpired ? undefined : new Date().toISOString(),
      });
    });
    return actionDetails;
  })[0];

  return {
    page,
    pageSize,
    startDate,
    endDate,
    elasticAgentIds: agentIds,
    commands,
    data,
    userIds,
    total: data.length ?? 0,
  };
};
