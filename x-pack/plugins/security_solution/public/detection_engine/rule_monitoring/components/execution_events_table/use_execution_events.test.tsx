/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cleanup, waitFor, renderHook } from '@testing-library/react';

import {
  LogLevelEnum,
  RuleExecutionEventTypeEnum,
} from '../../../../../common/api/detection_engine/rule_monitoring';

import { useExecutionEvents } from './use_execution_events';
import { useToasts } from '../../../../common/lib/kibana';
import { api } from '../../api';
import { createReactQueryWrapper } from '../../../../common/mock';

jest.mock('../../../../common/lib/kibana');
jest.mock('../../api');

const SOME_RULE_ID = 'some-rule-id';

describe('useExecutionEvents', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    cleanup();
  });

  const render = () =>
    renderHook(() => useExecutionEvents({ ruleId: SOME_RULE_ID }), {
      wrapper: createReactQueryWrapper(),
    });

  it('calls the API via fetchRuleExecutionEvents', async () => {
    const fetchRuleExecutionEvents = jest.spyOn(api, 'fetchRuleExecutionEvents');

    render();

    await waitFor(() => new Promise((resolve) => resolve(null)));

    expect(fetchRuleExecutionEvents).toHaveBeenCalledTimes(1);
    expect(fetchRuleExecutionEvents).toHaveBeenLastCalledWith(
      expect.objectContaining({ ruleId: SOME_RULE_ID })
    );
  });

  it('fetches data from the API', async () => {
    const { result } = render();

    // It starts from a loading state
    expect(result.current.isLoading).toEqual(true);
    expect(result.current.isSuccess).toEqual(false);
    expect(result.current.isError).toEqual(false);

    // When fetchRuleExecutionEvents returns
    await waitFor(() => {
      // It switches to a success state
      expect(result.current.isLoading).toEqual(false);
      expect(result.current.isSuccess).toEqual(true);
      expect(result.current.isError).toEqual(false);
      expect(result.current.data).toEqual({
        events: [
          {
            timestamp: '2021-12-29T10:42:59.996Z',
            sequence: 0,
            level: LogLevelEnum.info,
            type: RuleExecutionEventTypeEnum['status-change'],
            execution_id: 'execution-id-1',
            message: 'Rule changed status to "succeeded". Rule execution completed without errors',
          },
        ],
        pagination: {
          page: 1,
          per_page: 20,
          total: 1,
        },
      });
    });
  });

  it('handles exceptions from the API', async () => {
    const exception = new Error('Boom!');
    jest.spyOn(api, 'fetchRuleExecutionEvents').mockRejectedValue(exception);

    const { result } = render();

    // It starts from a loading state
    expect(result.current.isLoading).toEqual(true);
    expect(result.current.isSuccess).toEqual(false);
    expect(result.current.isError).toEqual(false);

    // When fetchRuleExecutionEvents throws
    await waitFor(() => {
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
});
