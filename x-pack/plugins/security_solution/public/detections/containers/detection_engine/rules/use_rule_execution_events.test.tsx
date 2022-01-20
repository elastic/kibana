/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { renderHook, cleanup } from '@testing-library/react-hooks';

import { RuleExecutionStatus } from '../../../../../common/detection_engine/schemas/common';
import { useAppToastsMock } from '../../../../common/hooks/use_app_toasts.mock';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useRuleExecutionEvents } from './use_rule_execution_events';

import * as api from './api';

jest.mock('./api');
jest.mock('../../../../common/hooks/use_app_toasts');

// TODO: https://github.com/elastic/kibana/pull/121644 clean up
describe('useRuleExecutionEvents', () => {
  (useAppToasts as jest.Mock).mockReturnValue(useAppToastsMock.create());

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    cleanup();
  });

  it('fetches data from the API (via fetchRuleExecutionEvents)', async () => {
    const fetchRuleExecutionEvents = jest.spyOn(api, 'fetchRuleExecutionEvents');
    const queryClient = new QueryClient();
    const wrapper: React.FC = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result, waitFor } = renderHook(() => useRuleExecutionEvents('some rule ID'), {
      wrapper,
    });

    await waitFor(() => result.current.isSuccess);

    expect(fetchRuleExecutionEvents).toHaveBeenCalledTimes(1);
    expect(result.current.isLoading).toEqual(false);
    expect(result.current.data).toEqual([
      {
        date: '2021-12-29T10:42:59.996Z',
        status: RuleExecutionStatus.succeeded,
        message: 'Rule executed successfully',
      },
    ]);
  });
});
