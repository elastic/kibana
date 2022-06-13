/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./api');
jest.mock('../../../../common/lib/kibana');

import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { renderHook, cleanup } from '@testing-library/react-hooks';

import { useRuleExecutionEvents } from './use_rule_execution_events';

import * as api from './api';
import { useToasts } from '../../../../common/lib/kibana';

const SOME_RULE_ID = 'some-rule-id';

describe('useRuleExecutionEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    cleanup();
  });

  const createReactQueryWrapper = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          // Turn retries off, otherwise we won't be able to test errors
          retry: false,
        },
      },
    });
    const wrapper: React.FC = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    return wrapper;
  };

  const render = () =>
    renderHook(
      () =>
        useRuleExecutionEvents({
          ruleId: SOME_RULE_ID,
          start: 'now-30',
          end: 'now',
          queryText: '',
          statusFilters: '',
        }),
      {
        wrapper: createReactQueryWrapper(),
      }
    );

  it('calls the API via fetchRuleExecutionEvents', async () => {
    const fetchRuleExecutionEvents = jest.spyOn(api, 'fetchRuleExecutionEvents');

    const { waitForNextUpdate } = render();

    await waitForNextUpdate();

    expect(fetchRuleExecutionEvents).toHaveBeenCalledTimes(1);
    expect(fetchRuleExecutionEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({ ruleId: SOME_RULE_ID })
    );
  });

  it('fetches data from the API', async () => {
    const { result, waitForNextUpdate } = render();

    // It starts from a loading state
    expect(result.current.isLoading).toEqual(true);
    expect(result.current.isSuccess).toEqual(false);
    expect(result.current.isError).toEqual(false);

    // When fetchRuleExecutionEvents returns
    await waitForNextUpdate();

    // It switches to a success state
    expect(result.current.isLoading).toEqual(false);
    expect(result.current.isSuccess).toEqual(true);
    expect(result.current.isError).toEqual(false);
    expect(result.current.data).toEqual({
      events: [
        {
          duration_ms: 3866,
          es_search_duration_ms: 1236,
          execution_uuid: '88d15095-7937-462c-8f21-9763e1387cad',
          gap_duration_ms: 0,
          indexing_duration_ms: 95,
          message:
            "rule executed: siem.queryRule:fb1fc150-a292-11ec-a2cf-c1b28b0392b0: 'Lots of Execution Events'",
          num_active_alerts: 0,
          num_errored_actions: 0,
          num_new_alerts: 0,
          num_recovered_alerts: 0,
          num_succeeded_actions: 1,
          num_triggered_actions: 1,
          schedule_delay_ms: -127535,
          search_duration_ms: 1255,
          security_message: 'succeeded',
          security_status: 'succeeded',
          status: 'success',
          timed_out: false,
          timestamp: '2022-03-13T06:04:05.838Z',
          total_search_duration_ms: 0,
        },
      ],
      total: 1,
    });
  });

  it('handles exceptions from the API', async () => {
    const exception = new Error('Boom!');
    jest.spyOn(api, 'fetchRuleExecutionEvents').mockRejectedValue(exception);

    const { result, waitForNextUpdate } = render();

    // It starts from a loading state
    expect(result.current.isLoading).toEqual(true);
    expect(result.current.isSuccess).toEqual(false);
    expect(result.current.isError).toEqual(false);

    // When fetchRuleExecutionEvents throws
    await waitForNextUpdate();

    // It switches to an error state
    expect(result.current.isLoading).toEqual(false);
    expect(result.current.isSuccess).toEqual(false);
    expect(result.current.isError).toEqual(true);
    expect(result.current.error).toEqual(exception);

    // And shows a toast with the caught exception
    expect(useToasts().addError).toHaveBeenCalledTimes(1);
    expect(useToasts().addError).toHaveBeenCalledWith(exception, {
      title: 'Failed to fetch rule execution events',
    });
  });
});
