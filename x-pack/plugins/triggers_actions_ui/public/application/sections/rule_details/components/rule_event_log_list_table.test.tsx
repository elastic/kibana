/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { v4 as uuidv4 } from 'uuid';
import { fireEvent, render, screen, waitFor, cleanup } from '@testing-library/react';
import { useKibana } from '../../../../common/lib/kibana';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { RuleEventLogListTable, RuleEventLogListTableProps } from './rule_event_log_list_table';
import {
  RULE_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS,
  GLOBAL_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS,
} from '../../../constants';
import { mockRule, mockLogResponse } from './test_helpers';
import { getJsDomPerformanceFix } from '../../test_utils';
import { loadActionErrorLog } from '../../../lib/rule_api/load_action_error_log';

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
jest.mock('../../../../common/lib/kibana');
jest.mock('../../../lib/rule_api/load_action_error_log', () => ({
  loadActionErrorLog: jest.fn(),
}));
jest.mock('../../../lib/rule_api/load_execution_log_aggregations', () => ({
  loadExecutionLogAggregations: jest.fn(),
}));
jest.mock('../../../../common/get_experimental_features', () => ({
  getIsExperimentalFeatureEnabled: jest.fn(),
}));
jest.mock('../../../hooks/use_load_rule_event_logs', () => ({
  useLoadRuleEventLogs: jest.fn(),
}));

const { getIsExperimentalFeatureEnabled } = jest.requireMock(
  '../../../../common/get_experimental_features'
);
const { useLoadRuleEventLogs } = jest.requireMock('../../../hooks/use_load_rule_event_logs');

const RuleEventLogListWithProvider = (props: RuleEventLogListTableProps<'stackManagement'>) => {
  return (
    <IntlProvider locale="en">
      <RuleEventLogListTable {...props} />
    </IntlProvider>
  );
};

const loadActionErrorLogMock = loadActionErrorLog as unknown as jest.MockedFunction<
  typeof loadActionErrorLog
>;
const ruleMock = mockRule();

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

const mockLoadEventLog = jest.fn();

const { fix, cleanup: cleanupJsDomePerformanceFix } = getJsDomPerformanceFix();

beforeAll(() => {
  fix();
});

afterAll(() => {
  cleanupJsDomePerformanceFix();
});

describe('rule_event_log_list_table', () => {
  beforeEach(() => {
    getIsExperimentalFeatureEnabled.mockImplementation(() => true);
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
    useLoadRuleEventLogs.mockReturnValue({
      data: mockLogResponse,
      isLoading: false,
      hasExceedLogs: false,
      loadEventLogs: mockLoadEventLog,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    cleanup();
  });

  it('renders correctly', async () => {
    render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);

    await waitFor(() => {
      expect(useLoadRuleEventLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: ruleMock.id,
          sort: [],
          outcomeFilter: [],
          page: 0,
          perPage: 10,
        })
      );

      RULE_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS.forEach((column) => {
        expect(screen.getByTestId(`dataGridHeaderCell-${column}`)).toBeInTheDocument();
      });
      expect(screen.getByTestId('eventLogStatusFilter')).toBeInTheDocument();
      expect(screen.getAllByText('rule execution #1').length).toEqual(4);
    });
  });

  it('should display loading spinner if loading event logs', async () => {
    useLoadRuleEventLogs.mockReturnValue({
      data: [],
      isLoading: true,
      hasExceedLogs: false,
      loadEventLogs: mockLoadEventLog,
    });

    render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);
    await waitFor(() => {
      expect(screen.getByTestId('centerJustifiedSpinner')).toBeInTheDocument();
    });
  });

  it('can sort by single column by ascending', async () => {
    render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);

    const timeStampCell = screen.getByTestId('dataGridHeaderCell-timestamp');
    fireEvent.click(timeStampCell.querySelector('button')!);

    const timeStampCellPopover = screen.getByTestId('dataGridHeaderCellActionGroup-timestamp');
    fireEvent.click(timeStampCellPopover.querySelectorAll('li')[0]!.querySelector('button')!);

    await waitFor(() => {
      expect(useLoadRuleEventLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: ruleMock.id,
          message: '',
          outcomeFilter: [],
          page: 0,
          perPage: 10,
          sort: [{ timestamp: { order: 'asc' } }],
        })
      );
    });
  });

  it('can sort single column by descending', async () => {
    render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);

    const timeStampCell = screen.getByTestId('dataGridHeaderCell-timestamp');
    fireEvent.click(timeStampCell.querySelector('button')!);

    const timeStampCellPopover = screen.getByTestId('dataGridHeaderCellActionGroup-timestamp');
    fireEvent.click(timeStampCellPopover.querySelectorAll('li')[1]!.querySelector('button')!);

    await waitFor(() => {
      expect(useLoadRuleEventLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: ruleMock.id,
          message: '',
          outcomeFilter: [],
          page: 0,
          perPage: 10,
          sort: [{ timestamp: { order: 'desc' } }],
        })
      );
    });
  });

  it('can filter by single execution status', async () => {
    render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);

    // Filter by success
    fireEvent.click(screen.getByTestId('eventLogStatusFilterButton'));
    fireEvent.click(screen.getByTestId('eventLogStatusFilter-success'));

    await waitFor(() => {
      expect(useLoadRuleEventLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: ruleMock.id,
          sort: [],
          outcomeFilter: ['success'],
          page: 0,
          perPage: 10,
        })
      );
    });
  });

  it('can filter by multiple execution status', async () => {
    render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);

    // Filter by success
    fireEvent.click(screen.getByTestId('eventLogStatusFilterButton'));
    fireEvent.click(screen.getByTestId('eventLogStatusFilter-success'));

    // Filter by failure as well
    fireEvent.click(screen.getByTestId('eventLogStatusFilterButton'));
    fireEvent.click(screen.getByTestId('eventLogStatusFilter-failure'));

    await waitFor(() => {
      expect(useLoadRuleEventLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: ruleMock.id,
          sort: [],
          outcomeFilter: ['success', 'failure'],
          page: 0,
          perPage: 10,
        })
      );
    });
  });

  it('can filter by rule types', async () => {
    render(
      <RuleEventLogListWithProvider ruleId={ruleMock.id} filteredRuleTypes={['test-1', 'test-2']} />
    );
    await waitFor(() => {
      expect(useLoadRuleEventLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: ruleMock.id,
          sort: [],
          page: 0,
          perPage: 10,
          ruleTypeIds: ['test-1', 'test-2'],
        })
      );
    });
  });

  describe('pagination', () => {
    beforeEach(() => {
      useLoadRuleEventLogs.mockReturnValue({
        data: {
          ...mockLogResponse,
          total: 100,
        },
        isLoading: true,
        hasExceedLogs: false,
        loadEventLogs: mockLoadEventLog,
      });
    });

    it('can paginate', async () => {
      render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);

      expect(screen.getByTestId('pagination-button-previous')).toBeInTheDocument();
      expect(screen.getByTestId('pagination-button-next')).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('pagination-button-1'));

      await waitFor(() => {
        expect(useLoadRuleEventLogs).toHaveBeenLastCalledWith(
          expect.objectContaining({
            id: ruleMock.id,
            sort: [],
            outcomeFilter: [],
            page: 1,
            perPage: 10,
          })
        );
      });
    });

    it('can change the page size', async () => {
      render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);

      // Change the page size
      fireEvent.click(screen.getByTestId('tablePaginationPopoverButton'));
      fireEvent.click(screen.getByTestId('tablePagination-50-rows'));

      await waitFor(() => {
        expect(useLoadRuleEventLogs).toHaveBeenLastCalledWith(
          expect.objectContaining({
            id: ruleMock.id,
            sort: [],
            outcomeFilter: [],
            page: 0,
            perPage: 50,
          })
        );
      });
    });

    it('shows the correct pagination results when results are 0', async () => {
      useLoadRuleEventLogs.mockReturnValue({
        data: {
          data: mockLogResponse.data,
          total: 0,
        },
        isLoading: false,
        hasExceedLogs: false,
        loadEventLogs: mockLoadEventLog,
      });
      render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);

      await waitFor(() => {
        expect(screen.getByTestId('eventLogPaginationStatus').textContent).toEqual(
          'Showing 0 of 0 log entries'
        );
      });
    });

    it('shows the correct pagination result when result is 1', async () => {
      useLoadRuleEventLogs.mockReturnValue({
        data: {
          data: mockLogResponse.data,
          total: 1,
        },
        isLoading: false,
        hasExceedLogs: false,
        loadEventLogs: mockLoadEventLog,
      });

      render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);

      await waitFor(() => {
        expect(screen.getByTestId('eventLogPaginationStatus').textContent).toEqual(
          'Showing 1 - 1 of 1 log entry'
        );
      });
    });

    it('shows the correct pagination result when paginated', async () => {
      useLoadRuleEventLogs.mockReturnValue({
        data: {
          data: mockLogResponse.data,
          total: 85,
        },
        isLoading: false,
        hasExceedLogs: false,
        loadEventLogs: mockLoadEventLog,
      });

      render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);

      expect(screen.getByTestId('eventLogPaginationStatus').textContent).toEqual(
        'Showing 1 - 10 of 85 log entries'
      );

      fireEvent.click(screen.getByTestId('pagination-button-1'));

      await waitFor(() => {
        expect(screen.getByTestId('eventLogPaginationStatus').textContent).toEqual(
          'Showing 11 - 20 of 85 log entries'
        );
      });
    });

    it('shows the correct pagination result when paginated to the last page', async () => {
      useLoadRuleEventLogs.mockReturnValue({
        data: {
          data: mockLogResponse.data,
          total: 85,
        },
        isLoading: false,
        hasExceedLogs: false,
        loadEventLogs: mockLoadEventLog,
      });

      render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);

      expect(screen.getByTestId('eventLogPaginationStatus').textContent).toEqual(
        'Showing 1 - 10 of 85 log entries'
      );

      fireEvent.click(screen.getByTestId('pagination-button-8'));

      await waitFor(() => {
        expect(screen.getByTestId('eventLogPaginationStatus').textContent).toEqual(
          'Showing 81 - 85 of 85 log entries'
        );
      });
    });
  });

  it('can filter by start and end date', async () => {
    render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);

    expect(useLoadRuleEventLogs).toHaveBeenLastCalledWith(
      expect.objectContaining({
        id: ruleMock.id,
        sort: [],
        outcomeFilter: [],
        page: 0,
        perPage: 10,
        dateStart: 'now-15m',
        dateEnd: 'now',
      })
    );

    fireEvent.click(screen.getByTestId('superDatePickerToggleQuickMenuButton'));
    fireEvent.click(screen.getByTestId('superDatePickerCommonlyUsed_Last_15 minutes'));

    await waitFor(() => {
      expect(useLoadRuleEventLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          id: ruleMock.id,
          sort: [],
          outcomeFilter: [],
          page: 0,
          perPage: 10,
          dateStart: 'now-15m',
          dateEnd: 'now',
        })
      );
    });
  });

  it('can save display columns to localStorage', async () => {
    render(
      <RuleEventLogListWithProvider
        ruleId={ruleMock.id}
        localStorageKey={'xpack.triggersActionsUI.RuleEventLogListWithProvider.initialColumns'}
      />
    );

    expect(
      JSON.parse(
        localStorage.getItem(
          'xpack.triggersActionsUI.RuleEventLogListWithProvider.initialColumns'
        ) ?? 'null'
      )
    ).toEqual(GLOBAL_EXECUTION_DEFAULT_INITIAL_VISIBLE_COLUMNS);

    fireEvent.click(screen.getByTestId('dataGridColumnSelectorButton'));
    fireEvent.click(
      screen.getByTestId('dataGridColumnSelectorToggleColumnVisibility-num_active_alerts')
    );

    await waitFor(() => {
      expect(
        JSON.parse(
          localStorage.getItem(
            'xpack.triggersActionsUI.RuleEventLogListWithProvider.initialColumns'
          ) ?? 'null'
        )
      ).toEqual(['timestamp', 'execution_duration', 'status', 'message', 'num_errored_actions']);
    });
  });

  describe('refine search prompt', () => {
    beforeEach(() => {
      useLoadRuleEventLogs.mockReturnValue({
        data: {
          data: mockLogResponse.data,
          total: 1100,
        },
        isLoading: false,
        hasExceedLogs: false,
        loadEventLogs: mockLoadEventLog,
      });
    });

    it('should not show the refine search prompt normally', async () => {
      render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);

      await waitFor(() => {
        expect(screen.queryByTestId('refineSearchPrompt')).not.toBeInTheDocument();
      });
    });

    it('should show the refine search prompt when our queries return too much data', async () => {
      render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);

      // Go to the last page
      fireEvent.click(screen.getByTestId('pagination-button-99'));

      // Prompt is shown
      await waitFor(() => {
        expect(screen.getByTestId('refineSearchPrompt')).toBeInTheDocument();
      });
    });
  });

  describe('Show exceed document prompt', () => {
    beforeEach(() => {
      useLoadRuleEventLogs.mockReturnValue({
        data: {
          data: [],
          total: 11000,
        },
        isLoading: false,
        hasExceedLogs: true,
        loadEventLogs: mockLoadEventLog,
      });
    });

    it('should show the exceed limit logs prompt normally', async () => {
      render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);

      await waitFor(() => {
        expect(screen.queryByTestId('exceedLimitLogsCallout')).toBeInTheDocument();
      });
    });

    it('should hide the logs table', async () => {
      render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);

      await waitFor(() => {
        expect(screen.queryByTestId('eventLogList')).not.toBeInTheDocument();
      });
    });
  });

  it('renders errored action badges in message rows', async () => {
    useLoadRuleEventLogs.mockReturnValue({
      data: {
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
      },
      isLoading: false,
      loadEventLogs: mockLoadEventLog,
    });

    render(<RuleEventLogListWithProvider ruleId={ruleMock.id} />);

    expect(screen.getByTestId('ruleActionErrorBadge').textContent).toEqual('4');

    // Click to open flyout
    fireEvent.click(screen.getByTestId('eventLogDataGridErroredActionBadge'));

    await waitFor(() => {
      expect(screen.getByTestId('ruleActionErrorLogFlyout')).toBeInTheDocument();
    });
  });
});
