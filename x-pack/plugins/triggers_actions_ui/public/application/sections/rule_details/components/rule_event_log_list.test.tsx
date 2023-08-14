/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { act } from 'react-dom/test-utils';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { useKibana } from '../../../../common/lib/kibana';
import { ActionGroup, ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { EuiSuperDatePicker, EuiDataGrid } from '@elastic/eui';
import { EventLogListStatusFilter } from '../../common/components/event_log';
import { RuleEventLogList } from './rule_event_log_list';
import { RefineSearchPrompt } from '../../common/components/refine_search_prompt';
import {
  RULE_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS,
  GLOBAL_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS,
} from '../../../constants';
import { mockRule, mockRuleType, mockRuleSummary, mockLogResponse } from './test_helpers';
import { RuleType } from '../../../../types';
import { loadActionErrorLog } from '../../../lib/rule_api/load_action_error_log';
import { ExperimentalFeaturesService } from '../../../../common/experimental_features_service';
import { ExperimentalFeatures } from '../../../../../common';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../lib/rule_api/load_action_error_log', () => ({
  loadActionErrorLog: jest.fn(),
}));

const loadActionErrorLogMock = loadActionErrorLog as unknown as jest.MockedFunction<
  typeof loadActionErrorLog
>;

const loadExecutionLogAggregationsMock = jest.fn();

const onChangeDurationMock = jest.fn();

const ruleMock = mockRule();

const authorizedConsumers = {
  [ALERTS_FEATURE_ID]: { read: true, all: true },
};

const recoveryActionGroup: ActionGroup<'recovered'> = { id: 'recovered', name: 'Recovered' };

const ruleType: RuleType = mockRuleType({
  producer: ALERTS_FEATURE_ID,
  authorizedConsumers,
  recoveryActionGroup,
});

const mockErrorLogResponse = {
  totalErrors: 1,
  errors: [
    {
      id: '66b9c04a-d5d3-4ed4-aa7c-94ddaca3ac1d',
      timestamp: '2022-03-31T18:03:33.133Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
  ],
};

describe('rule_event_log_list', () => {
  ExperimentalFeaturesService.init({
    experimentalFeatures: {
      ruleUseExecutionStatus: true,
    } as ExperimentalFeatures,
  });

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
    loadActionErrorLogMock.mockResolvedValue(mockErrorLogResponse);
    loadExecutionLogAggregationsMock.mockResolvedValue(mockLogResponse);
  });

  it('renders correctly', async () => {
    const wrapper = mountWithIntl(
      <RuleEventLogList
        ruleId={ruleMock.id}
        ruleType={ruleType}
        ruleSummary={mockRuleSummary({ ruleTypeId: ruleMock.ruleTypeId })}
        numberOfExecutions={60}
        onChangeDuration={onChangeDurationMock}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    // Run the initial load fetch call
    expect(loadExecutionLogAggregationsMock).toHaveBeenCalledTimes(1);

    expect(loadExecutionLogAggregationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: ruleMock.id,
        sort: [],
        outcomeFilter: [],
        page: 0,
        perPage: 10,
      })
    );

    // Loading
    expect(wrapper.find(EuiSuperDatePicker).props().isLoading).toBeTruthy();

    // Let the load resolve
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    // Verify the initial columns are rendered
    RULE_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS.forEach((column) => {
      expect(wrapper.find(`[data-test-subj="dataGridHeaderCell-${column}"]`).exists()).toBeTruthy();
    });

    expect(wrapper.find(EuiSuperDatePicker).props().isLoading).toBeFalsy();

    expect(wrapper.find(EventLogListStatusFilter).exists()).toBeTruthy();
    expect(wrapper.find('[data-gridcell-column-id="timestamp"]').length).toEqual(5);
    expect(wrapper.find(EuiDataGrid).props().rowCount).toEqual(mockLogResponse.total);
  });

  it('can filter by execution log outcome status', async () => {
    const wrapper = mountWithIntl(
      <RuleEventLogList
        ruleId={ruleMock.id}
        ruleType={ruleType}
        ruleSummary={mockRuleSummary({ ruleTypeId: ruleMock.ruleTypeId })}
        numberOfExecutions={60}
        onChangeDuration={onChangeDurationMock}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    // Filter by success
    wrapper.find('button[data-test-subj="eventLogStatusFilterButton"]').simulate('click');

    wrapper.find('button[data-test-subj="eventLogStatusFilter-success"]').simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadExecutionLogAggregationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: ruleMock.id,
        sort: [],
        outcomeFilter: ['success'],
        page: 0,
        perPage: 10,
      })
    );

    // Filter by failure as well
    wrapper.find('button[data-test-subj="eventLogStatusFilterButton"]').simulate('click');

    wrapper.find('button[data-test-subj="eventLogStatusFilter-failure"]').simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadExecutionLogAggregationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: ruleMock.id,
        sort: [],
        outcomeFilter: ['success', 'failure'],
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

    const { container } = render(
      <IntlProvider locale="en">
        <RuleEventLogList
          ruleId={ruleMock.id}
          ruleType={ruleType}
          ruleSummary={mockRuleSummary({ ruleTypeId: ruleMock.ruleTypeId })}
          numberOfExecutions={60}
          onChangeDuration={onChangeDurationMock}
          loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
        />
      </IntlProvider>
    );

    expect(await screen.findByTitle('Next page')).toBeInTheDocument();

    // Paginate to the next page
    const button = container.querySelector('a[data-test-subj="pagination-button-1"]');
    act(() => {
      fireEvent.click(button!);
    });

    expect(loadExecutionLogAggregationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: ruleMock.id,
        sort: [],
        outcomeFilter: [],
        page: 1,
        perPage: 10,
      })
    );
  });

  it('can change page size', async () => {
    loadExecutionLogAggregationsMock.mockResolvedValue({
      ...mockLogResponse,
      total: 100,
    });

    const wrapper = mountWithIntl(
      <RuleEventLogList
        ruleId={ruleMock.id}
        ruleType={ruleType}
        ruleSummary={mockRuleSummary({ ruleTypeId: ruleMock.ruleTypeId })}
        numberOfExecutions={60}
        onChangeDuration={onChangeDurationMock}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    // Change the page size
    wrapper.find('button[data-test-subj="tablePaginationPopoverButton"]').simulate('click');

    wrapper.find('button[data-test-subj="tablePagination-50-rows"]').simulate('click');

    // await act(async () => {
    //   await nextTick();
    //   wrapper.update();
    // });

    expect(loadExecutionLogAggregationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: ruleMock.id,
        sort: [],
        outcomeFilter: [],
        page: 0,
        perPage: 50,
      })
    );
  });

  it('can filter by start and end date', async () => {
    const nowMock = jest.spyOn(Date, 'now').mockReturnValue(0);

    const wrapper = mountWithIntl(
      <RuleEventLogList
        ruleId={ruleMock.id}
        ruleType={ruleType}
        ruleSummary={mockRuleSummary({ ruleTypeId: ruleMock.ruleTypeId })}
        numberOfExecutions={60}
        onChangeDuration={onChangeDurationMock}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(loadExecutionLogAggregationsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: ruleMock.id,
        sort: [],
        outcomeFilter: [],
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
        id: ruleMock.id,
        sort: [],
        outcomeFilter: [],
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
        ruleId={ruleMock.id}
        ruleType={ruleType}
        ruleSummary={mockRuleSummary({ ruleTypeId: ruleMock.ruleTypeId })}
        numberOfExecutions={60}
        onChangeDuration={onChangeDurationMock}
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
    ).toEqual(GLOBAL_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS);

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
    ).toEqual(['timestamp', 'execution_duration', 'status', 'message', 'num_errored_actions']);
  });

  it('does not show the refine search prompt normally', async () => {
    render(
      <IntlProvider locale="en">
        <RuleEventLogList
          ruleId={ruleMock.id}
          ruleType={ruleType}
          ruleSummary={mockRuleSummary({ ruleTypeId: ruleMock.ruleTypeId })}
          numberOfExecutions={60}
          onChangeDuration={onChangeDurationMock}
          loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
        />
      </IntlProvider>
    );

    expect(
      screen.queryByText(/documents matching your search, refine your search to see others./i)
    ).not.toBeInTheDocument();
  });

  it('shows the refine search prompt when our queries return too much data', async () => {
    loadExecutionLogAggregationsMock.mockResolvedValue({
      data: [],
      total: 1100,
    });

    const wrapper = mountWithIntl(
      <RuleEventLogList
        ruleId={ruleMock.id}
        ruleType={ruleType}
        ruleSummary={mockRuleSummary({ ruleTypeId: ruleMock.ruleTypeId })}
        numberOfExecutions={60}
        onChangeDuration={onChangeDurationMock}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    // Initially do not show the prompt
    expect(wrapper.find(RefineSearchPrompt).exists()).toBeFalsy();

    // Go to the last page
    wrapper.find('a[data-test-subj="pagination-button-99"]').simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    // Prompt is shown
    expect(wrapper.find(RefineSearchPrompt).text()).toEqual(
      'These are the first 1000 documents matching your search, refine your search to see others. Back to top.'
    );

    // Go to the second last page
    wrapper.find('a[data-test-subj="pagination-button-98"]').simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    // Prompt is not shown
    expect(wrapper.find(RefineSearchPrompt).exists()).toBeFalsy();
  });

  it('shows the correct pagination results when results are 0', async () => {
    loadExecutionLogAggregationsMock.mockResolvedValue({
      ...mockLogResponse,
      total: 0,
    });

    const wrapper = mountWithIntl(
      <RuleEventLogList
        ruleId={ruleMock.id}
        ruleType={ruleType}
        ruleSummary={mockRuleSummary({ ruleTypeId: ruleMock.ruleTypeId })}
        numberOfExecutions={60}
        onChangeDuration={onChangeDurationMock}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="eventLogPaginationStatus"]').first().text()).toEqual(
      'Showing 0 of 0 log entries'
    );
  });

  it.skip('shows the correct pagination result when result is 1', async () => {
    loadExecutionLogAggregationsMock.mockResolvedValue({
      ...mockLogResponse,
      total: 1,
    });

    const wrapper = mountWithIntl(
      <RuleEventLogList
        ruleId={ruleMock.id}
        ruleType={ruleType}
        ruleSummary={mockRuleSummary({ ruleTypeId: ruleMock.ruleTypeId })}
        numberOfExecutions={60}
        onChangeDuration={onChangeDurationMock}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="eventLogPaginationStatus"]').first().text()).toEqual(
      'Showing 1 - 1 of 1 log entry'
    );
  });

  it.skip('shows the correct pagination result when paginated', async () => {
    loadExecutionLogAggregationsMock.mockResolvedValue({
      ...mockLogResponse,
      total: 85,
    });

    const { container } = render(
      <IntlProvider locale="en">
        <RuleEventLogList
          ruleId={ruleMock.id}
          ruleType={ruleType}
          ruleSummary={mockRuleSummary({ ruleTypeId: ruleMock.ruleTypeId })}
          numberOfExecutions={60}
          onChangeDuration={onChangeDurationMock}
          loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
        />
      </IntlProvider>
    );

    expect(await screen.findByText('log entries')).toBeInTheDocument();
    expect(
      container.querySelector('[data-test-subj="eventLogPaginationStatus"]')
    ).toHaveTextContent('Showing 1 - 10 of 85 log entries');

    act(() => {
      fireEvent.click(container.querySelector('a[data-test-subj="pagination-button-8"]')!);
    });

    expect(
      container.querySelector('[data-test-subj="eventLogPaginationStatus"]')
    ).toHaveTextContent('Showing 81 - 85 of 85 log entries');
  });

  it.skip('renders errored action badges in message rows', async () => {
    loadExecutionLogAggregationsMock.mockResolvedValue({
      data: [
        {
          id: uuidv4(),
          timestamp: '2022-03-20T07:40:44-07:00',
          duration: 5000000,
          status: 'success',
          message: 'rule execution #1',
          version: '8.2.0',
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
      ],
      total: 1,
    });

    const wrapper = mountWithIntl(
      <RuleEventLogList
        ruleId={ruleMock.id}
        ruleType={ruleType}
        ruleSummary={mockRuleSummary({ ruleTypeId: ruleMock.ruleTypeId })}
        numberOfExecutions={60}
        onChangeDuration={onChangeDurationMock}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="ruleActionErrorBadge"]').first().text()).toEqual('4');

    // Click to open flyout
    wrapper.find('[data-test-subj="eventLogDataGridErroredActionBadge"]').first().simulate('click');
    expect(wrapper.find('[data-test-subj="ruleActionErrorLogFlyout"]').exists()).toBeTruthy();
  });

  it.skip('shows rule summary and execution duration chart', async () => {
    loadExecutionLogAggregationsMock.mockResolvedValue({
      ...mockLogResponse,
      total: 85,
    });

    const wrapper = mountWithIntl(
      <RuleEventLogList
        fetchRuleSummary={false}
        ruleId={ruleMock.id}
        ruleType={ruleType}
        ruleSummary={mockRuleSummary({ ruleTypeId: ruleMock.ruleTypeId })}
        numberOfExecutions={60}
        onChangeDuration={onChangeDurationMock}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    const avgExecutionDurationPanel = wrapper.find('[data-test-subj="avgExecutionDurationPanel"]');
    expect(avgExecutionDurationPanel.exists()).toBeTruthy();
    expect(avgExecutionDurationPanel.first().prop('color')).toEqual('subdued');
    expect(avgExecutionDurationPanel.first().text()).toEqual('Average duration00:00:00.100');
    expect(wrapper.find('[data-test-subj="ruleDurationWarning"]').exists()).toBeFalsy();

    expect(wrapper.find('[data-test-subj="executionDurationChartPanel"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="avgExecutionDurationPanel"]').exists()).toBeTruthy();
    expect(wrapper.find('[data-test-subj="ruleEventLogListAvgDuration"]').first().text()).toEqual(
      '00:00:00.100'
    );
  });

  it.skip('renders average execution duration', async () => {
    const ruleTypeCustom = mockRuleType({ ruleTaskTimeout: '10m' });
    const ruleSummary = mockRuleSummary({
      executionDuration: { average: 60284, valuesWithTimestamp: {} },
      ruleTypeId: ruleMock.ruleTypeId,
    });

    const wrapper = mountWithIntl(
      <RuleEventLogList
        fetchRuleSummary={false}
        ruleId={ruleMock.id}
        ruleType={ruleTypeCustom}
        ruleSummary={ruleSummary}
        numberOfExecutions={60}
        onChangeDuration={onChangeDurationMock}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    const avgExecutionDurationPanel = wrapper.find('[data-test-subj="avgExecutionDurationPanel"]');
    expect(avgExecutionDurationPanel.exists()).toBeTruthy();
    expect(avgExecutionDurationPanel.first().prop('color')).toEqual('subdued');
    expect(avgExecutionDurationPanel.first().text()).toEqual('Average duration00:01:00.284');
    expect(wrapper.find('[data-test-subj="ruleDurationWarning"]').exists()).toBeFalsy();
  });
});
