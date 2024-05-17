/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react';

import { mockQuery, mockAlertCountByRuleResult, parsedAlertCountByRuleResult } from './mock_data';
import type {
  UseAlertCountByRuleByStatus,
  UseAlertCountByRuleByStatusProps,
} from './use_alert_count_by_rule_by_status';
import { useAlertCountByRuleByStatus } from './use_alert_count_by_rule_by_status';

const dateNow = new Date('2022-04-15T12:00:00.000Z').valueOf();
const mockDateNow = jest.fn().mockReturnValue(dateNow);
Date.now = jest.fn(() => mockDateNow()) as unknown as DateConstructor['now'];

const defaultUseQueryAlertsReturn = {
  loading: false,
  data: null,
  setQuery: () => {},
  response: '',
  request: '',
  refetch: () => {},
};

const mockUseQueryAlerts = jest.fn().mockReturnValue(defaultUseQueryAlertsReturn);
jest.mock('../../../detections/containers/detection_engine/alerts/use_query', () => {
  return {
    useQueryAlerts: (...props: unknown[]) => mockUseQueryAlerts(...props),
  };
});

const from = '2020-07-07T08:20:18.966Z';
const to = '2020-07-08T08:20:18.966Z';

const mockUseGlobalTime = jest
  .fn()
  .mockReturnValue({ from, to, setQuery: jest.fn(), deleteQuery: jest.fn() });
jest.mock('../../containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

jest.mock('../../../detections/containers/detection_engine/alerts/use_signal_index', () => ({
  useSignalIndex: () => ({ signalIndexName: 'signalIndexName' }),
}));

const renderUseAlertCountByRuleByStatus = (
  overrides: Partial<UseAlertCountByRuleByStatusProps> = {}
) =>
  renderHook<UseAlertCountByRuleByStatusProps, ReturnType<UseAlertCountByRuleByStatus>>(() =>
    useAlertCountByRuleByStatus({
      skip: false,
      field: 'test_field',
      value: 'test_value',
      statuses: ['open'],
      queryId: 'queryId',
      signalIndexName: 'signalIndexName',
      ...overrides,
    })
  );

describe('useAlertCountByRuleByStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDateNow.mockReturnValue(dateNow);
    mockUseQueryAlerts.mockReturnValue(defaultUseQueryAlertsReturn);
  });

  it('should return default values', () => {
    const { result } = renderUseAlertCountByRuleByStatus();

    expect(result.current).toEqual({
      items: [],
      isLoading: false,
      updatedAt: dateNow,
    });

    expect(mockUseQueryAlerts).toBeCalledWith(mockQuery());
  });

  it('should return parsed items', () => {
    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: mockAlertCountByRuleResult,
    });

    const { result } = renderUseAlertCountByRuleByStatus();

    expect(result.current).toEqual({
      items: parsedAlertCountByRuleResult,
      isLoading: false,
      updatedAt: dateNow,
    });
  });

  it('should return new updatedAt', () => {
    const newDateNow = new Date('2022-04-08T14:00:00.000Z').valueOf();
    mockDateNow.mockReturnValue(newDateNow);
    mockDateNow.mockReturnValueOnce(dateNow);
    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: mockAlertCountByRuleResult,
    });

    const { result } = renderUseAlertCountByRuleByStatus();
    expect(mockDateNow).toHaveBeenCalled();
    expect(result.current).toEqual({
      items: parsedAlertCountByRuleResult,
      isLoading: false,
      updatedAt: newDateNow,
    });
  });

  it('should skip the query', () => {
    const { result } = renderUseAlertCountByRuleByStatus({ skip: true });

    expect(mockUseQueryAlerts).toBeCalledWith({ ...mockQuery(), skip: true });

    expect(result.current).toEqual({
      items: [],
      isLoading: false,
      updatedAt: dateNow,
    });
  });
});
