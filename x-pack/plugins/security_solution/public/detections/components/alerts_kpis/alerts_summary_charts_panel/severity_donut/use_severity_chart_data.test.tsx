/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../../../common/mock';
import { ALERTS_QUERY_NAMES } from '../../../../containers/detection_engine/alerts/constants';
import { mockAlertsData, alertsBySeverityQuery, parsedAlerts, from, to } from './mock_data';
import type { UseAlertsBySeverity, UseSeverityChartProps } from './use_severity_chart_data';
import { useSeverityChartData } from './use_severity_chart_data';

const dateNow = new Date('2022-04-08T12:00:00.000Z').valueOf();
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
jest.mock('../../../../containers/detection_engine/alerts/use_query', () => {
  return {
    useQueryAlerts: (...props: unknown[]) => mockUseQueryAlerts(...props),
  };
});

const mockUseGlobalTime = jest
  .fn()
  .mockReturnValue({ from, to, setQuery: jest.fn(), deleteQuery: jest.fn() });
jest.mock('../../../../../common/containers/use_global_time', () => {
  return {
    useGlobalTime: (...props: unknown[]) => mockUseGlobalTime(...props),
  };
});

// helper function to render the hook
const renderUseSeverityChartData = (props: Partial<UseSeverityChartProps> = {}) =>
  renderHook<UseSeverityChartProps, ReturnType<UseAlertsBySeverity>>(
    () =>
      useSeverityChartData({
        uniqueQueryId: 'test',
        signalIndexName: 'signal-alerts',
        ...props,
      }),
    {
      wrapper: TestProviders,
    }
  );

describe('useSeverityChartData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDateNow.mockReturnValue(dateNow);
    mockUseQueryAlerts.mockReturnValue(defaultUseQueryAlertsReturn);
  });

  it('should return default values', () => {
    const { result } = renderUseSeverityChartData();

    expect(result.current).toEqual({
      items: null,
      isLoading: false,
      updatedAt: dateNow,
    });

    expect(mockUseQueryAlerts).toBeCalledWith({
      query: alertsBySeverityQuery,
      indexName: 'signal-alerts',
      skip: false,
      queryName: ALERTS_QUERY_NAMES.COUNT,
    });
  });

  it('should return parsed items', () => {
    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: mockAlertsData,
    });

    const { result } = renderUseSeverityChartData();
    expect(result.current).toEqual({
      items: parsedAlerts,
      isLoading: false,
      updatedAt: dateNow,
    });
  });

  it('should return new updatedAt', () => {
    const newDateNow = new Date('2022-04-08T14:00:00.000Z').valueOf();
    mockDateNow.mockReturnValue(newDateNow); // setUpdatedAt call
    mockDateNow.mockReturnValueOnce(dateNow); // initialization call

    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: mockAlertsData,
    });

    const { result } = renderUseSeverityChartData();

    expect(mockDateNow).toHaveBeenCalled();
    expect(result.current).toEqual({
      items: parsedAlerts,
      isLoading: false,
      updatedAt: newDateNow,
    });
  });

  it('should skip the query', () => {
    const { result } = renderUseSeverityChartData({ skip: true });

    expect(mockUseQueryAlerts).toBeCalledWith({
      query: alertsBySeverityQuery,
      indexName: 'signal-alerts',
      skip: true,
      queryName: ALERTS_QUERY_NAMES.COUNT,
    });

    expect(result.current).toEqual({
      items: null,
      isLoading: false,
      updatedAt: dateNow,
    });
  });
});
