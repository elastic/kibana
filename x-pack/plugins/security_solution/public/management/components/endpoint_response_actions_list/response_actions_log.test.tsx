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
import type { IHttpFetchError } from '@kbn/core-http-browser';
import {
  createAppRootMockRenderer,
  type AppContextTestRender,
} from '../../../common/mock/endpoint';
import { ResponseActionsLog } from './response_actions_log';
import type {
  ActionFileInfoApiResponse,
  ActionListApiResponse,
} from '../../../../common/endpoint/types';
import { MANAGEMENT_PATH } from '../../../../common/constants';
import { getActionListMock } from './mocks';
import { useGetEndpointsList } from '../../hooks/endpoint/use_get_endpoints_list';
import { v4 as uuid } from 'uuid';
import { RESPONSE_ACTION_API_COMMANDS_NAMES } from '../../../../common/endpoint/service/response_actions/constants';
import { useUserPrivileges as _useUserPrivileges } from '../../../common/components/user_privileges';
import { responseActionsHttpMocks } from '../../mocks/response_actions_http_mocks';
import { waitFor } from '@testing-library/react';
import { getUserPrivilegesMockDefaultValue } from '../../../common/components/user_privileges/__mocks__';

let mockUseGetEndpointActionList: {
  isFetched?: boolean;
  isFetching?: boolean;
  error?: Partial<IHttpFetchError> | null;
  data?: ActionListApiResponse;
  refetch: () => unknown;
};
jest.mock('../../hooks/response_actions/use_get_endpoint_action_list', () => {
  const original = jest.requireActual('../../hooks/response_actions/use_get_endpoint_action_list');
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

jest.mock('../../hooks/endpoint/use_get_endpoints_list');

jest.mock('../../../common/experimental_features_service');

jest.mock('../../../common/components/user_privileges');

let mockUseGetFileInfo: {
  isFetching?: boolean;
  error?: Partial<IHttpFetchError> | null;
  data?: ActionFileInfoApiResponse;
};
jest.mock('../../hooks/response_actions/use_get_file_info', () => {
  const original = jest.requireActual('../../hooks/response_actions/use_get_file_info');
  return {
    ...original,
    useGetFileInfo: () => mockUseGetFileInfo,
  };
});

const mockUseGetEndpointsList = useGetEndpointsList as jest.Mock;

// FLAKY https://github.com/elastic/kibana/issues/145635
describe.skip('Response actions history', () => {
  const useUserPrivilegesMock = _useUserPrivileges as jest.Mock<
    ReturnType<typeof _useUserPrivileges>
  >;

  const testPrefix = 'response-actions-list';

  let render: (
    props?: React.ComponentProps<typeof ResponseActionsLog>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;
  let apiMocks: ReturnType<typeof responseActionsHttpMocks>;

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

    mockUseGetEndpointsList.mockReturnValue({
      data: Array.from({ length: 50 }).map(() => {
        const id = uuid.v4();
        return {
          id,
          name: `Host-${id.slice(0, 8)}`,
        };
      }),
      page: 0,
      pageSize: 50,
      total: 50,
    });
  });

  afterEach(() => {
    mockUseGetEndpointActionList = {
      ...baseMockedActionList,
    };
    jest.clearAllMocks();
    useUserPrivilegesMock.mockImplementation(getUserPrivilegesMockDefaultValue);
  });

  describe('When index does not exist yet', () => {
    it('should show global loader when waiting for response', () => {
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        isFetched: false,
        isFetching: true,
      };
      render();
      expect(renderResult.getByTestId(`${testPrefix}-global-loader`)).toBeTruthy();
    });
    it('should show empty page when there is no index', () => {
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        error: {
          body: { statusCode: 404, message: 'index_not_found_exception' },
        },
      };
      render();
      expect(renderResult.getByTestId(`${testPrefix}-empty-state`)).toBeTruthy();
    });
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
    beforeEach(() => {
      apiMocks = responseActionsHttpMocks(mockedContext.coreStart.http);
    });

    it('should show table when there is data', async () => {
      render();

      const { getByTestId } = renderResult;

      expect(getByTestId(`${testPrefix}-table-view`)).toBeTruthy();
      expect(getByTestId(`${testPrefix}-endpointListTableTotal`)).toHaveTextContent(
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
      const { getByTestId } = renderResult;

      expect(getByTestId(`${testPrefix}-table-view`)).toBeTruthy();
      expect(getByTestId(`${testPrefix}-endpointListTableTotal`)).toHaveTextContent(
        'Showing 1-10 of 13 response actions'
      );

      const page2 = getByTestId('pagination-button-1');
      userEvent.click(page2);
      expect(getByTestId(`${testPrefix}-endpointListTableTotal`)).toHaveTextContent(
        'Showing 11-13 of 13 response actions'
      );
    });

    it('should update per page rows on the table', async () => {
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data: await getActionListMock({ actionCount: 33 }),
      };

      render();
      const { getByTestId } = renderResult;

      expect(getByTestId(`${testPrefix}-table-view`)).toBeTruthy();
      expect(getByTestId(`${testPrefix}-endpointListTableTotal`)).toHaveTextContent(
        'Showing 1-10 of 33 response actions'
      );

      // should have 4 pages each of size 10.
      expect(getByTestId('pagination-button-0')).toHaveAttribute('aria-label', 'Page 1 of 4');

      // toggle page size popover
      userEvent.click(getByTestId('tablePaginationPopoverButton'));
      await waitForEuiPopoverOpen();
      // click size 20
      userEvent.click(getByTestId('tablePagination-20-rows'));

      expect(getByTestId(`${testPrefix}-endpointListTableTotal`)).toHaveTextContent(
        'Showing 1-20 of 33 response actions'
      );

      // should have only 2 pages each of size 20
      expect(getByTestId('pagination-button-0')).toHaveAttribute('aria-label', 'Page 1 of 2');
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
      const { getAllByTestId, queryAllByTestId } = renderResult;

      const expandButtons = getAllByTestId(`${testPrefix}-expand-button`);
      expandButtons.map((button) => userEvent.click(button));
      const trays = getAllByTestId(`${testPrefix}-details-tray`);
      expect(trays).toBeTruthy();
      expect(trays.length).toEqual(13);

      expandButtons.map((button) => userEvent.click(button));
      const noTrays = queryAllByTestId(`${testPrefix}-details-tray`);
      expect(noTrays).toEqual([]);
    });

    it('should contain relevant details in each expanded row', async () => {
      render();
      const { getAllByTestId } = renderResult;

      const expandButtons = getAllByTestId(`${testPrefix}-expand-button`);
      expandButtons.map((button) => userEvent.click(button));
      const trays = getAllByTestId(`${testPrefix}-details-tray`);
      expect(trays).toBeTruthy();
      expect(Array.from(trays[0].querySelectorAll('dt')).map((title) => title.textContent)).toEqual(
        [
          'Command placed',
          'Execution started on',
          'Execution completed',
          'Input',
          'Parameters',
          'Comment',
          'Output:',
        ]
      );
    });

    it('should contain download link in expanded row for `get-file` action WITH file operation permission', async () => {
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data: await getActionListMock({ actionCount: 1, commands: ['get-file'] }),
      };

      mockUseGetFileInfo = {
        isFetching: false,
        error: null,
        data: apiMocks.responseProvider.fileInfo(),
      };

      render();

      const { getByTestId } = renderResult;
      const expandButton = getByTestId(`${testPrefix}-expand-button`);
      userEvent.click(expandButton);

      await waitFor(() => {
        expect(apiMocks.responseProvider.fileInfo).toHaveBeenCalled();
      });

      const downloadLink = getByTestId(`${testPrefix}-getFileDownloadLink`);
      expect(downloadLink).toBeTruthy();
      expect(downloadLink.textContent).toEqual(
        'Click here to download(ZIP file passcode: elastic).Files are periodically deleted to clear storage space. Download and save file locally if needed.'
      );
    });

    it('should show file unavailable for download for `get-file` action WITH file operation permission when file is deleted', async () => {
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data: await getActionListMock({ actionCount: 1, commands: ['get-file'] }),
      };

      const fileInfo = apiMocks.responseProvider.fileInfo();
      fileInfo.data.status = 'DELETED';

      apiMocks.responseProvider.fileInfo.mockReturnValue(fileInfo);

      mockUseGetFileInfo = {
        isFetching: false,
        error: null,
        data: apiMocks.responseProvider.fileInfo(),
      };

      render();

      const { getByTestId } = renderResult;
      const expandButton = getByTestId(`${testPrefix}-expand-button`);
      userEvent.click(expandButton);

      await waitFor(() => {
        expect(apiMocks.responseProvider.fileInfo).toHaveBeenCalled();
      });

      const unavailableText = getByTestId(
        `${testPrefix}-getFileDownloadLink-fileNoLongerAvailable`
      );
      expect(unavailableText).toBeTruthy();
    });

    it('should not contain download link in expanded row for `get-file` action when NO file operation permission', async () => {
      const privileges = useUserPrivilegesMock();

      useUserPrivilegesMock.mockImplementationOnce(() => {
        return {
          ...privileges,
          endpointPrivileges: {
            ...privileges.endpointPrivileges,
            canWriteFileOperations: false,
          },
        };
      });

      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data: await getActionListMock({ actionCount: 1, commands: ['get-file'] }),
      };

      render();
      const { getByTestId, queryByTestId } = renderResult;

      const expandButton = getByTestId(`${testPrefix}-expand-button`);
      userEvent.click(expandButton);
      const output = getByTestId(`${testPrefix}-details-tray-output`);
      expect(output).toBeTruthy();
      expect(output.textContent).toEqual('get-file completed successfully');
      expect(queryByTestId(`${testPrefix}-getFileDownloadLink`)).toBeNull();
    });

    it('should refresh data when autoRefresh is toggled on', async () => {
      render();
      const { getByTestId } = renderResult;

      const quickMenuButton = getByTestId('superDatePickerToggleQuickMenuButton');
      userEvent.click(quickMenuButton);
      await waitForEuiPopoverOpen();

      const toggle = getByTestId('superDatePickerToggleRefreshButton');
      const intervalInput = getByTestId('superDatePickerRefreshIntervalInput');

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
      const { getByTestId } = renderResult;

      const quickMenuButton = getByTestId('superDatePickerToggleQuickMenuButton');
      const startDatePopoverButton = getByTestId(`superDatePickerShowDatesButton`);

      // shows 24 hours at first
      expect(startDatePopoverButton).toHaveTextContent('Last 24 hours');

      // pick another relative date
      userEvent.click(quickMenuButton);
      await waitForEuiPopoverOpen();
      userEvent.click(getByTestId('superDatePickerCommonlyUsed_Last_15 minutes'));
      expect(startDatePopoverButton).toHaveTextContent('Last 15 minutes');
    });
  });

  describe('Action status ', () => {
    const expandRows = () => {
      const { getAllByTestId } = renderResult;

      const expandButtons = getAllByTestId(`${testPrefix}-expand-button`);
      expandButtons.map((button) => userEvent.click(button));
      const outputs = getAllByTestId(`${testPrefix}-details-tray-output`);
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
    const filterPrefix = 'actions-filter';

    it('should have a search bar', () => {
      render();

      const { getByTestId } = renderResult;
      userEvent.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const searchBar = getByTestId(`${testPrefix}-${filterPrefix}-search`);
      expect(searchBar).toBeTruthy();
      expect(searchBar.querySelector('input')?.getAttribute('placeholder')).toEqual(
        'Search actions'
      );
    });

    it('should show a list of actions when opened', () => {
      render();
      const { getByTestId, getAllByTestId } = renderResult;

      userEvent.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const filterList = getByTestId(`${testPrefix}-${filterPrefix}-popoverList`);
      expect(filterList).toBeTruthy();
      expect(getAllByTestId(`${filterPrefix}-option`).length).toEqual(
        RESPONSE_ACTION_API_COMMANDS_NAMES.length
      );
      expect(getAllByTestId(`${filterPrefix}-option`).map((option) => option.textContent)).toEqual([
        'isolate',
        'release',
        'kill-process',
        'suspend-process',
        'processes',
        'get-file',
      ]);
    });

    it('should have `clear all` button `disabled` when no selected values', () => {
      render();
      const { getByTestId } = renderResult;

      userEvent.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const clearAllButton = getByTestId(`${testPrefix}-${filterPrefix}-clearAllButton`);
      expect(clearAllButton.hasAttribute('disabled')).toBeTruthy();
    });
  });

  describe('Statuses filter', () => {
    const filterPrefix = 'statuses-filter';

    it('should show a list of statuses when opened', () => {
      render();
      const { getByTestId, getAllByTestId } = renderResult;

      userEvent.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const filterList = getByTestId(`${testPrefix}-${filterPrefix}-popoverList`);
      expect(filterList).toBeTruthy();
      expect(getAllByTestId(`${filterPrefix}-option`).length).toEqual(3);
      expect(getAllByTestId(`${filterPrefix}-option`).map((option) => option.textContent)).toEqual([
        'Failed',
        'Pending',
        'Successful',
      ]);
    });

    it('should have `clear all` button `disabled` when no selected values', () => {
      render();

      const { getByTestId } = renderResult;

      userEvent.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const clearAllButton = getByTestId(`${testPrefix}-${filterPrefix}-clearAllButton`);
      expect(clearAllButton.hasAttribute('disabled')).toBeTruthy();
    });
  });

  describe('Hosts Filter', () => {
    const filterPrefix = 'hosts-filter';

    it('should show hosts filter for non-flyout or page', () => {
      render({ showHostNames: true });

      expect(renderResult.getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`)).toBeTruthy();
    });

    it('should have a search bar ', () => {
      render({ showHostNames: true });
      const { getByTestId } = renderResult;

      userEvent.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const searchBar = getByTestId(`${testPrefix}-${filterPrefix}-search`);
      expect(searchBar).toBeTruthy();
      expect(searchBar.querySelector('input')?.getAttribute('placeholder')).toEqual('Search hosts');
    });

    it('should show a list of host names when opened', () => {
      render({ showHostNames: true });
      const { getByTestId, getAllByTestId } = renderResult;

      const popoverButton = getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`);
      userEvent.click(popoverButton);
      const filterList = getByTestId(`${testPrefix}-${filterPrefix}-popoverList`);
      expect(filterList).toBeTruthy();
      expect(getAllByTestId(`${filterPrefix}-option`).length).toEqual(9);
      expect(
        getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`).querySelector(
          '.euiNotificationBadge'
        )?.textContent
      ).toEqual('50');
    });

    it('should not pin selected host names to the top when opened and selections are being made', () => {
      render({ showHostNames: true });
      const { getByTestId, getAllByTestId } = renderResult;

      const popoverButton = getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`);
      userEvent.click(popoverButton);
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);
      // click 3 options skip alternates
      allFilterOptions.forEach((option, i) => {
        if ([1, 3, 5].includes(i)) {
          option.style.pointerEvents = 'all';
          userEvent.click(option);
        }
      });

      const selectedFilterOptions = getAllByTestId(`${filterPrefix}-option`).reduce<number[]>(
        (acc, curr, i) => {
          if (curr.getAttribute('aria-checked') === 'true') {
            acc.push(i);
          }
          return acc;
        },
        []
      );

      expect(selectedFilterOptions).toEqual([1, 3, 5]);
    });

    it('should pin selected host names to the top when opened after selections were made', () => {
      render({ showHostNames: true });
      const { getByTestId, getAllByTestId } = renderResult;

      const popoverButton = getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`);
      userEvent.click(popoverButton);
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);
      // click 3 options skip alternates
      allFilterOptions.forEach((option, i) => {
        if ([1, 3, 5].includes(i)) {
          option.style.pointerEvents = 'all';
          userEvent.click(option);
        }
      });

      // close
      userEvent.click(popoverButton);

      // re-open
      userEvent.click(popoverButton);

      const selectedFilterOptions = getAllByTestId(`${filterPrefix}-option`).reduce<number[]>(
        (acc, curr, i) => {
          if (curr.getAttribute('aria-checked') === 'true') {
            acc.push(i);
          }
          return acc;
        },
        []
      );

      expect(selectedFilterOptions).toEqual([0, 1, 2]);
    });

    it('should not pin newly selected items with already pinned items', () => {
      render({ showHostNames: true });
      const { getByTestId, getAllByTestId } = renderResult;

      const popoverButton = getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`);
      userEvent.click(popoverButton);
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);
      // click 3 options skip alternates
      allFilterOptions.forEach((option, i) => {
        if ([1, 3, 5].includes(i)) {
          option.style.pointerEvents = 'all';
          userEvent.click(option);
        }
      });

      // close
      userEvent.click(popoverButton);

      // re-open
      userEvent.click(popoverButton);

      const newSetAllFilterOptions = getAllByTestId(`${filterPrefix}-option`);
      // click new options
      newSetAllFilterOptions.forEach((option, i) => {
        if ([4, 6, 8].includes(i)) {
          option.style.pointerEvents = 'all';
          userEvent.click(option);
        }
      });

      const selectedFilterOptions = getAllByTestId(`${filterPrefix}-option`).reduce<number[]>(
        (acc, curr, i) => {
          if (curr.getAttribute('aria-checked') === 'true') {
            acc.push(i);
          }
          return acc;
        },
        []
      );

      expect(selectedFilterOptions).toEqual([0, 1, 2, 4, 6, 8]);
    });

    it('should update the selected options count correctly', () => {
      render({ showHostNames: true });
      const { getByTestId, getAllByTestId } = renderResult;

      const popoverButton = getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`);
      userEvent.click(popoverButton);
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);
      // click 3 options skip alternates
      allFilterOptions.forEach((option, i) => {
        if ([0, 2, 4, 6].includes(i)) {
          option.style.pointerEvents = 'all';
          userEvent.click(option);
        }
      });

      expect(popoverButton.textContent).toEqual('Hosts4');
    });
  });
});
