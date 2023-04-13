/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import userEvent from '@testing-library/user-event';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import {
  type AppContextTestRender,
  createAppRootMockRenderer,
} from '../../../../common/mock/endpoint';
import { ResponseActionsListPage } from './response_actions_list_page';
import type { ActionListApiResponse } from '../../../../../common/endpoint/types';
import { MANAGEMENT_PATH } from '../../../../../common/constants';
import { getActionListMock } from '../../../components/endpoint_response_actions_list/mocks';
import { useGetEndpointsList } from '../../../hooks/endpoint/use_get_endpoints_list';

jest.mock('../../../../common/experimental_features_service');

let mockUseGetEndpointActionList: {
  isFetched?: boolean;
  isFetching?: boolean;
  error?: Partial<IHttpFetchError> | null;
  data?: ActionListApiResponse;
  refetch: () => unknown;
};
jest.mock('../../../hooks/response_actions/use_get_endpoint_action_list', () => {
  const original = jest.requireActual(
    '../../../hooks/response_actions/use_get_endpoint_action_list'
  );
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

jest.mock('../../../hooks/endpoint/use_get_endpoints_list');
const mockUseGetEndpointsList = useGetEndpointsList as jest.Mock;

describe('Response actions history page', () => {
  const testPrefix = 'response-actions-list';

  let render: () => ReturnType<AppContextTestRender['render']>;
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
    render = () => (renderResult = mockedContext.render(<ResponseActionsListPage />));
    reactTestingLibrary.act(() => {
      history.push(`${MANAGEMENT_PATH}/response_actions`);
    });

    mockUseGetEndpointActionList = {
      ...baseMockedActionList,
      data: await getActionListMock({ actionCount: 43 }),
    };

    mockUseGetEndpointsList.mockReturnValue({
      data: Array.from({ length: 10 }).map((_, i) => {
        return {
          id: `agent-id-${i}`,
          name: `Host-name-${i}`,
        };
      }),
      page: 0,
      pageSize: 50,
      total: 10,
    });
  });

  afterEach(() => {
    mockUseGetEndpointActionList = {
      ...baseMockedActionList,
    };
    jest.clearAllMocks();
  });

  describe('Hide/Show header', () => {
    it('should show header when data is in', () => {
      reactTestingLibrary.act(() => {
        history.push('/administration/response_actions_history?page=3&pageSize=20');
      });
      render();
      const { getByTestId } = renderResult;
      expect(getByTestId('responseActionsPage-header')).toBeTruthy();
    });

    it('should not show header when there is no actions index', () => {
      reactTestingLibrary.act(() => {
        history.push('/administration/response_actions_history?page=3&pageSize=20');
      });
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        error: {
          body: { statusCode: 404, message: 'index_not_found_exception' },
        },
      };
      render();
      const { queryByTestId } = renderResult;
      expect(queryByTestId('responseActionsPage-header')).toBeNull();
    });
  });

  describe('Read from URL params', () => {
    it('should read and set paging values from URL params', () => {
      reactTestingLibrary.act(() => {
        history.push('/administration/response_actions_history?page=3&pageSize=20');
      });
      render();
      const { getByTestId } = renderResult;

      expect(history.location.search).toEqual('?page=3&pageSize=20');
      expect(getByTestId('tablePaginationPopoverButton').textContent).toContain('20');
      expect(getByTestId('pagination-button-2').getAttribute('aria-current')).toStrictEqual('true');
    });

    it('should read and set command filter values from URL params', () => {
      const filterPrefix = 'actions-filter';
      reactTestingLibrary.act(() => {
        history.push('/administration/response_actions_history?commands=release,processes');
      });

      render();
      const { getAllByTestId, getByTestId } = renderResult;
      userEvent.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      const selectedFilterOptions = allFilterOptions.reduce<string[]>((acc, option) => {
        if (option.getAttribute('aria-checked') === 'true') {
          acc.push(option.textContent?.split('-')[0].trim() as string);
        }
        return acc;
      }, []);

      expect(selectedFilterOptions.length).toEqual(2);
      expect(selectedFilterOptions).toEqual(['release', 'processes']);
      expect(history.location.search).toEqual('?commands=release,processes');
    });

    it('should read and set hosts filter values from URL params', () => {
      mockUseGetEndpointsList.mockReturnValue({
        data: Array.from({ length: 10 }).map((_, i) => {
          return {
            id: `agent-id-${i}`,
            name: `Host-name-${i}`,
            selected: [0, 1, 3, 5].includes(i) ? true : false,
          };
        }),
        page: 0,
        pageSize: 50,
        total: 10,
      });

      const filterPrefix = 'hosts-filter';
      reactTestingLibrary.act(() => {
        history.push(
          '/administration/response_actions_history?hosts=agent-id-1,agent-id-2,agent-id-4,agent-id-5'
        );
      });

      render();
      const { getAllByTestId, getByTestId } = renderResult;

      userEvent.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      const selectedFilterOptions = allFilterOptions.reduce<string[]>((acc, option) => {
        if (option.getAttribute('aria-checked') === 'true') {
          acc.push(option.textContent?.split(' - ')[0] as string);
        }
        return acc;
      }, []);

      expect(selectedFilterOptions.length).toEqual(4);
      expect(selectedFilterOptions).toEqual([
        'Host-name-0',
        'Host-name-1',
        'Host-name-3',
        'Host-name-5',
      ]);
      expect(history.location.search).toEqual('?hosts=agent-id-1,agent-id-2,agent-id-4,agent-id-5');
    });

    it('should read and set status filter values from URL params', () => {
      const filterPrefix = 'statuses-filter';
      reactTestingLibrary.act(() => {
        history.push('/administration/response_actions_history?statuses=pending,failed');
      });

      render();
      const { getAllByTestId, getByTestId } = renderResult;
      userEvent.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      const selectedFilterOptions = allFilterOptions.reduce<string[]>((acc, option) => {
        if (option.getAttribute('aria-checked') === 'true') {
          acc.push(option.textContent?.split('-')[0].trim() as string);
        }
        return acc;
      }, []);

      expect(selectedFilterOptions.length).toEqual(2);
      expect(selectedFilterOptions).toEqual(['Failed', 'Pending']);
      expect(history.location.search).toEqual('?statuses=pending,failed');
    });

    it('should set selected users search input strings to URL params ', () => {
      const filterPrefix = 'users-filter';
      reactTestingLibrary.act(() => {
        history.push('/administration/response_actions_history?users=userX,userY');
      });

      render();
      const { getByTestId } = renderResult;
      const usersInput = getByTestId(`${testPrefix}-${filterPrefix}-search`);
      expect(usersInput).toHaveValue('userX,userY');
      expect(history.location.search).toEqual('?users=userX,userY');
    });

    it('should read and set relative date ranges filter values from URL params', () => {
      reactTestingLibrary.act(() => {
        history.push('/administration/response_actions_history?startDate=now-23m&endDate=now-1m');
      });

      render();
      const { getByTestId } = renderResult;

      expect(getByTestId('superDatePickerstartDatePopoverButton').textContent).toEqual(
        '~ 23 minutes ago'
      );
      expect(getByTestId('superDatePickerendDatePopoverButton').textContent).toEqual(
        '~ a minute ago'
      );
      expect(history.location.search).toEqual('?startDate=now-23m&endDate=now-1m');
    });

    it('should read and set absolute date ranges filter values from URL params', () => {
      const startDate = '2022-09-12T11:00:00.000Z';
      const endDate = '2022-09-12T11:30:33.000Z';
      reactTestingLibrary.act(() => {
        history.push(
          `/administration/response_actions_history?startDate=${startDate}&endDate=${endDate}`
        );
      });

      const { getByTestId } = render();

      expect(getByTestId('superDatePickerstartDatePopoverButton').textContent).toEqual(
        'Sep 12, 2022 @ 07:00:00.000'
      );
      expect(getByTestId('superDatePickerendDatePopoverButton').textContent).toEqual(
        'Sep 12, 2022 @ 07:30:33.000'
      );
      expect(history.location.search).toEqual(`?startDate=${startDate}&endDate=${endDate}`);
    });
  });

  describe('Set selected/set values to URL params', () => {
    it('should set selected page number to URL params', () => {
      render();
      const { getByTestId } = renderResult;

      userEvent.click(getByTestId('pagination-button-1'));
      expect(history.location.search).toEqual('?page=2&pageSize=10');
    });

    it('should set selected pageSize value to URL params', () => {
      render();
      const { getByTestId } = renderResult;

      userEvent.click(getByTestId('tablePaginationPopoverButton'));
      const pageSizeOption = getByTestId('tablePagination-20-rows');
      pageSizeOption.style.pointerEvents = 'all';
      userEvent.click(pageSizeOption);

      expect(history.location.search).toEqual('?page=1&pageSize=20');
    });

    it('should set selected command filter options to URL params ', () => {
      const filterPrefix = 'actions-filter';
      render();
      const { getAllByTestId, getByTestId } = renderResult;
      userEvent.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      allFilterOptions.forEach((option) => {
        option.style.pointerEvents = 'all';
        userEvent.click(option);
      });

      expect(history.location.search).toEqual(
        '?commands=isolate%2Crelease%2Ckill-process%2Csuspend-process%2Cprocesses%2Cget-file%2Cexecute'
      );
    });

    it('should set selected hosts filter options to URL params ', () => {
      const filterPrefix = 'hosts-filter';
      render();
      const { getAllByTestId, getByTestId } = renderResult;
      userEvent.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      allFilterOptions.forEach((option, i) => {
        if ([0, 1, 2].includes(i)) {
          option.style.pointerEvents = 'all';
          userEvent.click(option);
        }
      });

      expect(history.location.search).toEqual('?hosts=agent-id-0%2Cagent-id-1%2Cagent-id-2');
    });

    it('should set selected status filter options to URL params ', () => {
      const filterPrefix = 'statuses-filter';
      render();
      const { getAllByTestId, getByTestId } = renderResult;
      userEvent.click(getByTestId(`${testPrefix}-${filterPrefix}-popoverButton`));
      const allFilterOptions = getAllByTestId(`${filterPrefix}-option`);

      allFilterOptions.forEach((option) => {
        option.style.pointerEvents = 'all';
        userEvent.click(option);
      });

      expect(history.location.search).toEqual('?statuses=failed%2Cpending%2Csuccessful');
    });

    it('should set selected users search input strings to URL params ', () => {
      const filterPrefix = 'users-filter';
      render();
      const { getByTestId } = renderResult;
      const usersInput = getByTestId(`${testPrefix}-${filterPrefix}-search`);
      userEvent.type(usersInput, '   , userX , userY, ,');
      userEvent.type(usersInput, '{enter}');

      expect(history.location.search).toEqual('?users=userX%2CuserY');
    });

    it('should set selected relative date range filter options to URL params ', async () => {
      const { getByTestId } = render();
      const quickMenuButton = getByTestId('superDatePickerToggleQuickMenuButton');
      const startDatePopoverButton = getByTestId(`superDatePickerShowDatesButton`);

      // shows 24 hours at first
      expect(startDatePopoverButton).toHaveTextContent('Last 24 hours');

      // pick another relative date
      userEvent.click(quickMenuButton);
      await waitForEuiPopoverOpen();
      userEvent.click(getByTestId('superDatePickerCommonlyUsed_Last_15 minutes'));
      expect(startDatePopoverButton).toHaveTextContent('Last 15 minutes');

      expect(history.location.search).toEqual('?endDate=now&startDate=now-15m');
    });
  });
});
