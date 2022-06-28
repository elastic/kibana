/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import React from 'react';
import * as reactTestingLibrary from '@testing-library/react';
import { AppContextTestRender, createAppRootMockRenderer } from '../../../../common/mock/endpoint';
import { ResponseActionsList } from './response_actions_list';
import { ActionDetails, ActionListApiResponse } from '../../../../../common/endpoint/types';
import { useKibana, useUiSetting$ } from '../../../../common/lib/kibana';
import { createUseUiSetting$Mock } from '../../../../common/lib/kibana/kibana_react.mock';
import { DEFAULT_TIMEPICKER_QUICK_RANGES, MANAGEMENT_PATH } from '../../../../../common/constants';
import { EndpointActionGenerator } from '../../../../../common/endpoint/data_generators/endpoint_action_generator';
import userEvent from '@testing-library/user-event';

let mockUseGetEndpointActionList: {
  isFetched?: boolean;
  isFetching?: boolean;
  error?: null;
  data?: ActionListApiResponse;
  refetch: () => unknown;
};
jest.mock('../../../hooks/endpoint/use_get_endpoint_action_list', () => {
  const original = jest.requireActual('../../../hooks/endpoint/use_get_endpoint_action_list');
  return {
    ...original,
    useGetEndpointActionList: () => mockUseGetEndpointActionList,
  };
});

const mockUseUiSetting$ = useUiSetting$ as jest.Mock;
const timepickerRanges = [
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
];
jest.mock('../../../../common/lib/kibana');

describe('Response Actions List', () => {
  const testPrefix = 'response-actions-list';

  let render: (
    props: React.ComponentProps<typeof ResponseActionsList>
  ) => ReturnType<AppContextTestRender['render']>;
  let renderResult: ReturnType<typeof render>;
  let history: AppContextTestRender['history'];
  let mockedContext: AppContextTestRender;

  beforeEach(() => {
    mockedContext = createAppRootMockRenderer();
    ({ history } = mockedContext);
    render = (props: React.ComponentProps<typeof ResponseActionsList>) =>
      (renderResult = mockedContext.render(<ResponseActionsList {...props} />));
    reactTestingLibrary.act(() => {
      history.push(`${MANAGEMENT_PATH}/response_actions`);
    });
    (useKibana as jest.Mock).mockReturnValue({ services: mockedContext.startServices });
    mockUseUiSetting$.mockImplementation((key, defaultValue) => {
      const useUiSetting$Mock = createUseUiSetting$Mock();

      return key === DEFAULT_TIMEPICKER_QUICK_RANGES
        ? [timepickerRanges, jest.fn()]
        : useUiSetting$Mock(key, defaultValue);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('', () => {
    const refetchFunction = jest.fn();
    const baseMockedActionList = {
      isFetched: true,
      isFetching: false,
      error: null,
      refetch: refetchFunction,
    };
    beforeEach(async () => {
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
        data: await getActionListMock({ actionCount: 13 }),
      };
    });

    afterEach(() => {
      mockUseGetEndpointActionList = {
        ...baseMockedActionList,
      };
    });

    describe('Table View', () => {
      it('should show date filters', () => {
        render({});
        expect(renderResult.getByTestId('actionListSuperDatePicker')).toBeTruthy();
      });

      it('should show empty state when there is no data', async () => {
        mockUseGetEndpointActionList = {
          ...baseMockedActionList,
          data: await getActionListMock({ actionCount: 0 }),
        };
        render({});
        expect(renderResult.getByTestId(`${testPrefix}-empty-prompt`)).toBeTruthy();
      });

      it('should show table when there is data', async () => {
        render({});
        expect(renderResult.getByTestId(`${testPrefix}-table-view`)).toBeTruthy();
        expect(renderResult.getByTestId(`${testPrefix}-endpointListTableTotal`)).toHaveTextContent(
          'Showing 1-10 of 13 response actions'
        );
      });

      it('should show expected column names on the table', async () => {
        render({});
        expect(
          Array.from(
            renderResult.getByTestId(`${testPrefix}-table-view`).querySelectorAll('thead th')
          )
            .slice(0, 6)
            .map((col) => col.textContent)
        ).toEqual(['Time', 'Command/action', 'User', 'Host', 'Comments', 'Status']);
      });

      it('should paginate table when there is data', async () => {
        render({});

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

      it('should show 1-1 record label when only 1 record', async () => {
        mockUseGetEndpointActionList = {
          ...baseMockedActionList,
          data: await getActionListMock({ actionCount: 1 }),
        };
        render({});
        expect(renderResult.getByTestId(`${testPrefix}-endpointListTableTotal`)).toHaveTextContent(
          'Showing 1-1 of 1 response action'
        );
      });

      it('should expand each row to show details', async () => {
        render({});

        const expandButtons = renderResult.getAllByTestId(`${testPrefix}-expand-button`);
        expandButtons.map((button) => userEvent.click(button));
        const trays = renderResult.getAllByTestId(`${testPrefix}-output-section`);
        expect(trays).toBeTruthy();
        expect(trays.length).toEqual(13);

        expandButtons.map((button) => userEvent.click(button));
        const noTrays = renderResult.queryAllByTestId(`${testPrefix}-output-section`);
        expect(noTrays).toEqual([]);
      });

      it('should refresh data when autoRefresh is toggled on', async () => {
        render({});
        const quickMenu = renderResult.getByTestId('superDatePickerToggleQuickMenuButton');
        userEvent.click(quickMenu);

        const toggle = renderResult.getByTestId('superDatePickerToggleRefreshButton');
        const intervalInput = renderResult.getByTestId('superDatePickerRefreshIntervalInput');

        userEvent.click(toggle);
        reactTestingLibrary.fireEvent.change(intervalInput, { target: { value: 1 } });

        await new Promise((r) => setTimeout(r, 3000));
        expect(refetchFunction).toHaveBeenCalledTimes(3);
      });
    });

    describe('Without agentIds filter', () => {
      it('should show a host column', async () => {
        render({});
        expect(renderResult.getByTestId(`tableHeaderCell_agents_3`)).toBeTruthy();
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
        ).toEqual(['Time', 'Command/action', 'User', 'Comments', 'Status']);
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
        ).toEqual(['Time', 'Command/action', 'User', 'Host', 'Comments', 'Status']);
      });
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
}: {
  agentIds?: string[];
  commands?: string[];
  actionCount?: number;
  endDate?: string;
  page?: number;
  pageSize?: number;
  startDate?: string;
  userIds?: string[];
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
