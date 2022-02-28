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

import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common';
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
    renderHook(() => useRuleExecutionEvents(SOME_RULE_ID), {
      wrapper: createReactQueryWrapper(),
    });

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
    expect(result.current.data).toEqual([
      {
        date: '2021-12-29T10:42:59.996Z',
        status: RuleExecutionStatus.succeeded,
        message: 'Rule executed successfully',
      },
    ]);
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
