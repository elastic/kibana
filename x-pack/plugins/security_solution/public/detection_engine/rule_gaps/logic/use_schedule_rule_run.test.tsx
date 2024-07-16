/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, renderHook } from '@testing-library/react-hooks';
import moment from 'moment';
import { useKibana } from '../../../common/lib/kibana';
import { useKibana as mockUseKibana } from '../../../common/lib/kibana/__mocks__';
import { TestProviders } from '../../../common/mock';
import { useScheduleRuleRun } from './use_schedule_rule_run';

const mockUseScheduleRuleRunMutation = jest.fn();

jest.mock('../../../common/lib/kibana');
jest.mock('../api/hooks/use_schedule_rule_run_mutation', () => ({
  useScheduleRuleRunMutation: () => {
    return {
      mutateAsync: mockUseScheduleRuleRunMutation,
    };
  },
}));

const mockedUseKibana = {
  ...mockUseKibana(),
  services: {
    ...mockUseKibana().services,
    telemetry: {
      reportManualRuleRunExecute: jest.fn(),
    },
  },
};

describe('When using the `useScheduleRuleRun()` hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useKibana as jest.Mock).mockReturnValue(mockedUseKibana);
  });

  it('should send schedule rule run request', async () => {
    const { result, waitFor } = renderHook(() => useScheduleRuleRun(), {
      wrapper: TestProviders,
    });

    const timeRange = { startDate: moment().subtract(1, 'd'), endDate: moment() };
    act(() => {
      result.current.scheduleRuleRun({ ruleIds: ['rule-1'], timeRange });
    });

    await waitFor(() => {
      return mockUseScheduleRuleRunMutation.mock.calls.length > 0;
    });

    expect(mockUseScheduleRuleRunMutation).toHaveBeenCalledWith(
      expect.objectContaining({
        ruleIds: ['rule-1'],
        timeRange,
      })
    );
  });

  it('should call reportManualRuleRunExecute with success status on success', async () => {
    const { result, waitFor } = renderHook(() => useScheduleRuleRun(), {
      wrapper: TestProviders,
    });

    const timeRange = { startDate: moment().subtract(1, 'd'), endDate: moment() };
    mockUseScheduleRuleRunMutation.mockResolvedValueOnce([{ id: 'rule-1' }]);

    act(() => {
      result.current.scheduleRuleRun({ ruleIds: ['rule-1'], timeRange });
    });

    await waitFor(() => {
      return mockUseScheduleRuleRunMutation.mock.calls.length > 0;
    });

    expect(mockedUseKibana.services.telemetry.reportManualRuleRunExecute).toHaveBeenCalledWith({
      rangeInMs: timeRange.endDate.diff(timeRange.startDate),
      status: 'success',
      rulesCount: 1,
    });
  });

  it('should call reportManualRuleRunExecute with error status on failure', async () => {
    const { result, waitFor } = renderHook(() => useScheduleRuleRun(), {
      wrapper: TestProviders,
    });

    const timeRange = { startDate: moment().subtract(1, 'd'), endDate: moment() };
    mockUseScheduleRuleRunMutation.mockRejectedValueOnce(new Error('Error scheduling rule run'));

    act(() => {
      result.current.scheduleRuleRun({ ruleIds: ['rule-1'], timeRange });
    });

    await waitFor(() => {
      return mockUseScheduleRuleRunMutation.mock.calls.length > 0;
    });

    expect(mockedUseKibana.services.telemetry.reportManualRuleRunExecute).toHaveBeenCalledWith({
      rangeInMs: timeRange.endDate.diff(timeRange.startDate),
      status: 'error',
      rulesCount: 1,
    });
  });
});
