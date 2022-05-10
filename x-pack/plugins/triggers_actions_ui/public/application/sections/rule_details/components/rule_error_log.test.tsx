/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { useKibana } from '../../../../common/lib/kibana';

import { EuiSuperDatePicker } from '@elastic/eui';
import { Rule } from '../../../../types';
import { RefineSearchPrompt } from '../refine_search_prompt';
import { RuleErrorLog } from './rule_error_log';

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
jest.mock('../../../../common/lib/kibana');

const mockLogResponse: any = {
  total: 8,
  data: [],
  totalErrors: 12,
  errors: [
    {
      id: '66b9c04a-d5d3-4ed4-aa7c-94ddaca3ac1d',
      timestamp: '2022-03-31T18:03:33.133Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: '14fcfe1c-5403-458f-8549-fa8ef59cdea3',
      timestamp: '2022-03-31T18:02:30.119Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: 'd53a401e-2a3a-4abe-8913-26e08a5039fd',
      timestamp: '2022-03-31T18:01:27.112Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: '9cfeae08-24b4-4d5c-b870-a303418f14d6',
      timestamp: '2022-03-31T18:00:24.113Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: '66b9c04a-d5d3-4ed4-aa7c-94ddaca3ac23',
      timestamp: '2022-03-31T18:03:21.133Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: '14fcfe1c-5403-458f-8549-fa8ef59cde18',
      timestamp: '2022-03-31T18:02:18.119Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: 'd53a401e-2a3a-4abe-8913-26e08a503915',
      timestamp: '2022-03-31T18:01:15.112Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: '9cfeae08-24b4-4d5c-b870-a303418f1412',
      timestamp: '2022-03-31T18:00:12.113Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: '66b9c04a-d5d3-4ed4-aa7c-94ddaca3ac09',
      timestamp: '2022-03-31T18:03:09.133Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: '14fcfe1c-5403-458f-8549-fa8ef59cde06',
      timestamp: '2022-03-31T18:02:06.119Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: 'd53a401e-2a3a-4abe-8913-26e08a503903',
      timestamp: '2022-03-31T18:01:03.112Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
    {
      id: '9cfeae08-24b4-4d5c-b870-a303418f1400',
      timestamp: '2022-03-31T18:00:00.113Z',
      type: 'alerting',
      message:
        "rule execution failure: .es-query:d87fcbd0-b11b-11ec-88f6-293354dba871: 'Mine' - x_content_parse_exception: [parsing_exception] Reason: unknown query [match_allxxxx] did you mean [match_all]?",
    },
  ],
};

const mockRule: Rule = {
  id: '56b61397-13d7-43d0-a583-0fa8c704a46f',
  enabled: true,
  name: 'rule-56b61397-13d7-43d0-a583-0fa8c704a46f',
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

describe('rule_error_log', () => {
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
    const nowMock = jest.spyOn(Date, 'now').mockReturnValue(0);
    const wrapper = mountWithIntl(
      <RuleErrorLog
        rule={mockRule}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    // No data initially
    expect(wrapper.find('.euiTableRow .euiTableCellContent__text').first().text()).toEqual(
      'No items found'
    );

    // Run the initial load fetch call
    expect(loadExecutionLogAggregationsMock).toHaveBeenCalledTimes(1);

    expect(loadExecutionLogAggregationsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        dateEnd: '1969-12-31T19:00:00-05:00',
        dateStart: '1969-12-30T19:00:00-05:00',
        id: '56b61397-13d7-43d0-a583-0fa8c704a46f',
        page: 0,
        perPage: 1,
        sort: { timestamp: { order: 'desc' } },
      })
    );

    // Loading
    expect(wrapper.find(EuiSuperDatePicker).props().isLoading).toBeTruthy();

    expect(wrapper.find('[data-test-subj="tableHeaderCell_timestamp_0"]').exists()).toBeTruthy();

    // Let the load resolve
    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(EuiSuperDatePicker).props().isLoading).toBeFalsy();
    expect(wrapper.find('.euiTableRow').length).toEqual(10);

    nowMock.mockRestore();
  });

  it('can sort on timestamp columns', async () => {
    const wrapper = mountWithIntl(
      <RuleErrorLog
        rule={mockRule}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });
    expect(
      wrapper.find('.euiTableRow').first().find('.euiTableCellContent').first().text()
    ).toEqual('Mar 31, 2022 @ 14:03:33.133');

    wrapper.find('button[data-test-subj="tableHeaderSortButton"]').first().simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(
      wrapper.find('.euiTableRow').first().find('.euiTableCellContent').first().text()
    ).toEqual('Mar 31, 2022 @ 14:00:00.113');
  });

  it('can paginate', async () => {
    loadExecutionLogAggregationsMock.mockResolvedValue({
      ...mockLogResponse,
      total: 100,
    });

    const wrapper = mountWithIntl(
      <RuleErrorLog
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
    wrapper.find('[data-test-subj="pagination-button-next"]').first().simulate('click');

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('.euiTableRow').length).toEqual(2);
  });

  it('can filter by start and end date', async () => {
    const nowMock = jest.spyOn(Date, 'now').mockReturnValue(0);

    const wrapper = mountWithIntl(
      <RuleErrorLog
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
        dateEnd: '1969-12-31T19:00:00-05:00',
        dateStart: '1969-12-30T19:00:00-05:00',
        id: '56b61397-13d7-43d0-a583-0fa8c704a46f',
        page: 0,
        perPage: 1,
        sort: { timestamp: { order: 'desc' } },
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
        dateStart: '1969-12-31T18:45:00-05:00',
        dateEnd: '1969-12-31T19:00:00-05:00',
        id: '56b61397-13d7-43d0-a583-0fa8c704a46f',
        page: 0,
        perPage: 1,
        sort: { timestamp: { order: 'desc' } },
      })
    );

    nowMock.mockRestore();
  });

  it('does not show the refine search prompt normally', async () => {
    const wrapper = mountWithIntl(
      <RuleErrorLog
        rule={mockRule}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(RefineSearchPrompt).text()).toBeFalsy();
  });

  it('shows the refine search prompt when our queries return too much data', async () => {
    loadExecutionLogAggregationsMock.mockResolvedValue({
      ...mockLogResponse,
      totalErrors: 1000,
    });

    const wrapper = mountWithIntl(
      <RuleErrorLog
        rule={mockRule}
        loadExecutionLogAggregations={loadExecutionLogAggregationsMock}
      />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find(RefineSearchPrompt).text()).toEqual(
      'These are the first 1000 matching your search, refine your search to see others. Back to top.'
    );
  });
});
