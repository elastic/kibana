/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../common/mock/endpoint';
import { ResponseActionsLog } from './response_actions_log';
import type { ActionListApiResponse } from '../../../../common/endpoint/types';
import { MANAGEMENT_PATH } from '../../../../common/constants';
import { getActionListMock } from './mocks';

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

describe('Response Actions Log', () => {
  const testPrefix = 'response-actions-list';

  let render: (
    props?: React.ComponentProps<typeof ResponseActionsLog>
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
    render = (props?: React.ComponentProps<typeof ResponseActionsLog>) =>
      (renderResult = mockedContext.render(<ResponseActionsLog {...(props ?? {})} />));
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

    it('should show actions filter', () => {
      render();
      expect(renderResult.getByTestId(`${testPrefix}-actions-filter-popoverButton`)).toBeTruthy();
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
      render({ agentIds: 'agent-a' });

      expect(
        Array.from(
          renderResult.getByTestId(`${testPrefix}-table-view`).querySelectorAll('thead th')
        )
          .slice(0, 6)
          .map((col) => col.textContent)
      ).toEqual(['Time', 'Command', 'User', 'Comments', 'Status', 'Expand rows']);
    });

    it('should show `Hosts` column when `showHostNames` is TRUE', async () => {
      render({ showHostNames: true });

      expect(
        Array.from(
          renderResult.getByTestId(`${testPrefix}-table-view`).querySelectorAll('thead th')
        )
          .slice(0, 7)
          .map((col) => col.textContent)
      ).toEqual(['Time', 'Command', 'User', 'Hosts', 'Comments', 'Status', 'Expand rows']);
    });

    it('should show multiple hostnames correctly', async () => {
      const data = await getActionListMock({ actionCount: 1 });
      data.data[0] = {
        ...data.data[0],
        hosts: {
          ...data.data[0].hosts,
          'agent-b': { name: 'Host-agent-b' },
          'agent-c': { name: '' },
          'agent-d': { name: 'Host-agent-d' },
        },
      };

      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data,
      };
      render({ showHostNames: true });

      expect(renderResult.getByTestId(`${testPrefix}-column-hostname`)).toHaveTextContent(
        'Host-agent-a, Host-agent-b, Host-agent-d'
      );
    });

    it('should show display host is unenrolled for a single agent action when metadata host name is empty', async () => {
      const data = await getActionListMock({ actionCount: 1 });
      data.data[0] = {
        ...data.data[0],
        hosts: {
          ...data.data[0].hosts,
          'agent-a': { name: '' },
        },
      };

      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data,
      };
      render({ showHostNames: true });

      expect(renderResult.getByTestId(`${testPrefix}-column-hostname`)).toHaveTextContent(
        'Host unenrolled'
      );
    });

    it('should show display host is unenrolled for a single agent action when metadata host names are empty', async () => {
      const data = await getActionListMock({ actionCount: 1 });
      data.data[0] = {
        ...data.data[0],
        hosts: {
          ...data.data[0].hosts,
          'agent-a': { name: '' },
          'agent-b': { name: '' },
          'agent-c': { name: '' },
        },
      };

      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data,
      };
      render({ showHostNames: true });

      expect(renderResult.getByTestId(`${testPrefix}-column-hostname`)).toHaveTextContent(
        'Hosts unenrolled'
      );
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

      const superRefreshButton = renderResult.getByTestId(`${testPrefix}-super-refresh-button`);
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

    it('shows completed status badge for successfully completed actions', async () => {
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
      ).toEqual(['Successful', 'Successful']);
    });

    it('shows Failed status badge for failed actions', async () => {
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data: await getActionListMock({ actionCount: 2, wasSuccessful: false, status: 'failed' }),
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
        data: await getActionListMock({
          actionCount: 2,
          isCompleted: false,
          isExpired: true,
          status: 'failed',
        }),
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
        data: await getActionListMock({ actionCount: 2, isCompleted: false, status: 'pending' }),
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

  describe('Actions filter', () => {
    const filterPrefix = '-actions-filter';

    it('should have a search bar', () => {
      render();
      userEvent.click(renderResult.getByTestId(`${testPrefix}${filterPrefix}-popoverButton`));
      const searchBar = renderResult.getByTestId(`${testPrefix}${filterPrefix}-search`);
      expect(searchBar).toBeTruthy();
      expect(searchBar.querySelector('input')?.getAttribute('placeholder')).toEqual(
        'Search actions'
      );
    });

    it('should show a list of actions when opened', () => {
      render();
      userEvent.click(renderResult.getByTestId(`${testPrefix}${filterPrefix}-popoverButton`));
      const filterList = renderResult.getByTestId(`${testPrefix}${filterPrefix}-popoverList`);
      expect(filterList).toBeTruthy();
      expect(filterList.querySelectorAll('ul>li').length).toEqual(5);
      expect(
        Array.from(filterList.querySelectorAll('ul>li')).map((option) => option.textContent)
      ).toEqual(['isolate', 'release', 'kill-process', 'suspend-process', 'processes']);
    });

    it('should have `clear all` button `disabled` when no selected values', () => {
      render();
      userEvent.click(renderResult.getByTestId(`${testPrefix}${filterPrefix}-popoverButton`));
      const clearAllButton = renderResult.getByTestId(
        `${testPrefix}${filterPrefix}-clearAllButton`
      );
      expect(clearAllButton.hasAttribute('disabled')).toBeTruthy();
    });
  });

  describe('Statuses filter', () => {
    const filterPrefix = '-statuses-filter';

    it('should show a list of statuses when opened', () => {
      render();
      userEvent.click(renderResult.getByTestId(`${testPrefix}${filterPrefix}-popoverButton`));
      const filterList = renderResult.getByTestId(`${testPrefix}${filterPrefix}-popoverList`);
      expect(filterList).toBeTruthy();
      expect(filterList.querySelectorAll('ul>li').length).toEqual(3);
      expect(
        Array.from(filterList.querySelectorAll('ul>li')).map((option) => option.textContent)
      ).toEqual(['Failed', 'Pending', 'Successful']);
    });

    it('should have `clear all` button `disabled` when no selected values', () => {
      render();
      userEvent.click(renderResult.getByTestId(`${testPrefix}${filterPrefix}-popoverButton`));
      const clearAllButton = renderResult.getByTestId(
        `${testPrefix}${filterPrefix}-clearAllButton`
      );
      expect(clearAllButton.hasAttribute('disabled')).toBeTruthy();
    });
  });
});
