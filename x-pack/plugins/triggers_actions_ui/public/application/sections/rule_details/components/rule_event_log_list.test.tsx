/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import uuid from 'uuid';
import { act } from 'react-dom/test-utils';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { useKibana } from '../../../../common/lib/kibana';

import { EuiSuperDatePicker, EuiDataGrid } from '@elastic/eui';
import { RuleEventLogListStatusFilter } from './rule_event_log_list_status_filter';
import { RuleEventLogList, DEFAULT_INITIAL_VISIBLE_COLUMNS } from './rule_event_log_list';
import { Rule } from '../../../../types';

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
jest.mock('../../../../common/lib/kibana');

const mockLogResponse: any = {
  data: [
    {
      id: uuid.v4(),
      timestamp: '2022-03-20T07:40:44-07:00',
      duration: 5000000,
      status: 'success',
      message: 'rule execution #1',
      num_active_alerts: 2,
      num_new_alerts: 4,
      num_recovered_alerts: 3,
      num_triggered_actions: 10,
      num_succeeded_actions: 0,
      num_errored_actions: 4,
      total_search_duration: 1000000,
      es_search_duration: 1400000,
      schedule_delay: 2000000,
      timed_out: false,
    },
    {
      id: uuid.v4(),
      timestamp: '2022-03-20T07:40:45-07:00',
      duration: 6000000,
      status: 'success',
      message: 'rule execution #2',
      num_active_alerts: 4,
      num_new_alerts: 2,
      num_recovered_alerts: 4,
      num_triggered_actions: 5,
      num_succeeded_actions: 3,
      num_errored_actions: 0,
      total_search_duration: 300000,
      es_search_duration: 300000,
      schedule_delay: 300000,
      timed_out: false,
    },
    {
      id: uuid.v4(),
      timestamp: '2022-03-20T07:40:46-07:00',
      duration: 340000,
      status: 'failure',
      message: 'rule execution #3',
      num_active_alerts: 8,
      num_new_alerts: 5,
      num_recovered_alerts: 0,
      num_triggered_actions: 1,
      num_succeeded_actions: 1,
      num_errored_actions: 4,
      total_search_duration: 2300000,
      es_search_duration: 2300000,
      schedule_delay: 2300000,
      timed_out: false,
    },
    {
      id: uuid.v4(),
      timestamp: '2022-03-21T07:40:46-07:00',
      duration: 3000000,
      status: 'unknown',
      message: 'rule execution #4',
      num_active_alerts: 4,
      num_new_alerts: 4,
      num_recovered_alerts: 4,
      num_triggered_actions: 4,
      num_succeeded_actions: 4,
      num_errored_actions: 4,
      total_search_duration: 400000,
      es_search_duration: 400000,
      schedule_delay: 400000,
      timed_out: false,
    },
  ],
  total: 4,
};

const mockRule: Rule = {
  id: uuid.v4(),
  enabled: true,
  name: `rule-${uuid.v4()}`,
  tags: [],
  ruleTypeId: '.noop',
  consumer: 'consumer',
  schedule: { interval: '1m' },
  actions: [],
  params: {},
  createdBy: null,
  updatedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  apiKeyOwner: null,
  throttle: null,
  notifyWhen: null,
  muteAll: false,
  mutedInstanceIds: [],
  executionStatus: {
    status: 'unknown',
    lastExecutionDate: new Date('2020-08-20T19:23:38Z'),
  },
};

const loadExecutionLogAggregationsMock = jest.fn();

describe('rule_event_log_list', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.uiSettings.get = jest.fn().mockImplementation((value: string) => {
      if (value === 'timepicker:quickRanges') {
        return [
          {
            from: 'now-15m',
            to: 'now',
            display: 'Last 15 minutes',
          },
        ];
      }
    });
    loadExecutionLogAggregationsMock.mockResolvedValue(mockLogResponse);
  });

  it('renders correctly', async () => {
    const wrapper = mountWithIntl(
      <RuleEventLogList
        rule={mockRule}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    // Run the initial load fetch call
    expect(loadExecutionLogAggregationsMock).toHaveBeenCalledTimes(1);

    expect(loadExecutionLogAggregationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: mockRule.id,
        sort: [],
        filter: [],
        page: 0,
        perPage: 10,
      })
    );

    // Loading
    expect(wrapper.find(EuiSuperDatePicker).props().isLoading).toBeTruthy();

    // Verify the initial columns are rendered
    DEFAULT_INITIAL_VISIBLE_COLUMNS.forEach((column) => {
      expect(wrapper.find(`[data-test-subj="dataGridHeaderCell-${column}"]`).exists()).toBeTruthy();
    });

    // No data initially
    expect(wrapper.find('[data-gridcell-column-id="timestamp"]').length).toEqual(1);

    // Let the load resolve
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(EuiSuperDatePicker).props().isLoading).toBeFalsy();

    expect(wrapper.find(RuleEventLogListStatusFilter).exists()).toBeTruthy();
    expect(wrapper.find('[data-gridcell-column-id="timestamp"]').length).toEqual(5);
    expect(wrapper.find(EuiDataGrid).props().rowCount).toEqual(mockLogResponse.total);
  });

  it('can sort by single and/or multiple column(s)', async () => {
    const wrapper = mountWithIntl(
      <RuleEventLogList
        rule={mockRule}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    let headerCellButton = wrapper.find('[data-test-subj="dataGridHeaderCell-timestamp"] button');

    headerCellButton.simulate('click');

    let headerAction = wrapper.find('[data-test-subj="dataGridHeaderCellActionGroup-timestamp"]');

    expect(headerAction.exists()).toBeTruthy();

    // Sort by the timestamp column
    headerAction.find('li').at(1).find('button').simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadExecutionLogAggregationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: mockRule.id,
        sort: [
          {
            timestamp: {
              order: 'asc',
            },
          },
        ],
        filter: [],
        page: 0,
        perPage: 10,
      })
    );

    // Open the popover again
    headerCellButton.simulate('click');

    headerAction = wrapper.find('[data-test-subj="dataGridHeaderCellActionGroup-timestamp"]');

    // Sort by the timestamp column, this time, in the opposite direction
    headerAction.find('li').at(2).find('button').simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadExecutionLogAggregationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: mockRule.id,
        sort: [
          {
            timestamp: {
              order: 'desc',
            },
          },
        ],
        filter: [],
        page: 0,
        perPage: 10,
      })
    );

    // Find another column
    headerCellButton = wrapper.find(
      '[data-test-subj="dataGridHeaderCell-execution_duration"] button'
    );

    // Open the popover again
    headerCellButton.simulate('click');

    headerAction = wrapper.find(
      '[data-test-subj="dataGridHeaderCellActionGroup-execution_duration"]'
    );

    // Sort
    headerAction.find('li').at(1).find('button').simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadExecutionLogAggregationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: mockRule.id,
        sort: [
          {
            timestamp: { order: 'desc' },
          },
          {
            execution_duration: { order: 'asc' },
          },
        ],
        filter: [],
        page: 0,
        perPage: 10,
      })
    );
  });

  it('can filter by execution log outcome status', async () => {
    const wrapper = mountWithIntl(
      <RuleEventLogList
        rule={mockRule}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    // Filter by success
    wrapper.find('[data-test-subj="ruleEventLogStatusFilterButton"]').at(0).simulate('click');

    wrapper.find('[data-test-subj="ruleEventLogStatusFilter-success"]').at(0).simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadExecutionLogAggregationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: mockRule.id,
        sort: [],
        filter: ['success'],
        page: 0,
        perPage: 10,
      })
    );

    // Filter by failure as well
    wrapper.find('[data-test-subj="ruleEventLogStatusFilterButton"]').at(0).simulate('click');

    wrapper.find('[data-test-subj="ruleEventLogStatusFilter-failure"]').at(0).simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadExecutionLogAggregationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: mockRule.id,
        sort: [],
        filter: ['success', 'failure'],
        page: 0,
        perPage: 10,
      })
    );
  });

  it('can paginate', async () => {
    loadExecutionLogAggregationsMock.mockResolvedValue({
      ...mockLogResponse,
      total: 100,
    });

    const wrapper = mountWithIntl(
      <RuleEventLogList
        rule={mockRule}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('.euiPagination').exists()).toBeTruthy();

    // Paginate to the next page
    wrapper.find('.euiPagination .euiPagination__item a').at(0).simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadExecutionLogAggregationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: mockRule.id,
        sort: [],
        filter: [],
        page: 1,
        perPage: 10,
      })
    );

    // Change the page size
    wrapper.find('[data-test-subj="tablePaginationPopoverButton"] button').simulate('click');

    wrapper.find('[data-test-subj="tablePagination-50-rows"] button').simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadExecutionLogAggregationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: mockRule.id,
        sort: [],
        filter: [],
        page: 0,
        perPage: 50,
      })
    );
  });

  it('can filter by start and end date', async () => {
    const nowMock = jest.spyOn(Date, 'now').mockReturnValue(0);

    const wrapper = mountWithIntl(
      <RuleEventLogList
        rule={mockRule}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadExecutionLogAggregationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: mockRule.id,
        sort: [],
        filter: [],
        page: 0,
        perPage: 10,
        dateStart: '1969-12-30T19:00:00-05:00',
        dateEnd: '1969-12-31T19:00:00-05:00',
      })
    );

    wrapper
      .find('[data-test-subj="superDatePickerToggleQuickMenuButton"] button')
      .simulate('click');

    wrapper
      .find('[data-test-subj="superDatePickerCommonlyUsed_Last_15 minutes"] button')
      .simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadExecutionLogAggregationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: mockRule.id,
        sort: [],
        filter: [],
        page: 0,
        perPage: 10,
        dateStart: '1969-12-31T18:45:00-05:00',
        dateEnd: '1969-12-31T19:00:00-05:00',
      })
    );

    nowMock.mockRestore();
  });

  it('can save display columns to localStorage', async () => {
    const wrapper = mountWithIntl(
      <RuleEventLogList
        rule={mockRule}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(
      JSON.parse(
        localStorage.getItem('xpack.triggersActionsUI.ruleEventLogList.initialColumns') ?? 'null'
      )
    ).toEqual(DEFAULT_INITIAL_VISIBLE_COLUMNS);

    wrapper.find('[data-test-subj="dataGridColumnSelectorButton"] button').simulate('click');

    wrapper
      .find(
        '[data-test-subj="dataGridColumnSelectorToggleColumnVisibility-num_active_alerts"] button'
      )
      .simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(
      JSON.parse(
        localStorage.getItem('xpack.triggersActionsUI.ruleEventLogList.initialColumns') ?? 'null'
      )
    ).toEqual([...DEFAULT_INITIAL_VISIBLE_COLUMNS, 'num_active_alerts']);
  });
});
