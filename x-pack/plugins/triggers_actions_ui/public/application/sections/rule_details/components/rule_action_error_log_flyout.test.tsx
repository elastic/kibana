/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { v4 as uuid } from 'uuid';
import { act } from 'react-dom/test-utils';
import { mountWithIntl, nextTick } from '@kbn/test-jest-helpers';
import { RuleActionErrorLogFlyout } from './rule_action_error_log_flyout';
import { loadActionErrorLog } from '../../../lib/rule_api/load_action_error_log';

jest.mock('../../../lib/rule_api/load_action_error_log', () => ({
  loadActionErrorLog: jest.fn(),
}));

const mockUseIsWithinBreakpoints = jest.fn();
jest.mock('@elastic/eui', () => {
  const original = jest.requireActual('@elastic/eui');
  return {
    ...original,
    useIsWithinBreakpoints: () => mockUseIsWithinBreakpoints(),
  };
});

const loadActionErrorLogMock = loadActionErrorLog as unknown as jest.MockedFunction<
  typeof loadActionErrorLog
>;

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

const mockExecution: any = {
  id: uuid(),
  rule_id: uuid(),
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
};

const mockClose = jest.fn();

describe('rule_action_error_log_flyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    loadActionErrorLogMock.mockResolvedValue(mockErrorLogResponse);
    mockUseIsWithinBreakpoints.mockReturnValue(true);
  });

  it('renders correctly', async () => {
    const wrapper = mountWithIntl(
      <RuleActionErrorLogFlyout runLog={mockExecution} onClose={mockClose} />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(wrapper.find('[data-test-subj="RuleErrorLog"]').exists()).toBeTruthy();
    expect(
      wrapper.find('[data-test-subj="ruleActionErrorLogFlyoutMessageText"]').first().text()
    ).toEqual(mockExecution.message);
    expect(wrapper.find('[data-test-subj="ruleActionErrorBadge"]').first().text()).toEqual('4');
  });

  it('can close the flyout', async () => {
    const wrapper = mountWithIntl(
      <RuleActionErrorLogFlyout runLog={mockExecution} onClose={mockClose} />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    wrapper.find('[data-test-subj="ruleActionErrorLogFlyoutCloseButton"] button').simulate('click');

    expect(mockClose).toHaveBeenCalledTimes(1);
  });

  it('switches between push and overlay flyout depending on the size of the screen', async () => {
    const wrapper = mountWithIntl(
      <RuleActionErrorLogFlyout runLog={mockExecution} onClose={mockClose} />
    );

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    mockUseIsWithinBreakpoints.mockReturnValue(false);

    await act(async () => {
      await nextTick();
      wrapper.update();
    });

    expect(
      wrapper.find('[data-test-subj="ruleActionErrorLogFlyout"]').first().props().type
    ).toEqual('push');
  });
});
