/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../../../common/mock';
import { ALERTS_QUERY_NAMES } from '../../../../containers/detection_engine/alerts/constants';
import type { UseAlerts } from '.';
import type { UseAlertsQueryProps } from '../types';
import { useSummaryChartData, getAlertsQuery } from '.';
import * as aggregations from './aggregations';
import * as severityMock from '../mocks/mock_severity_response';
import * as detectionMock from '../mocks/mock_detections_response';
import * as hostMock from '../mocks/mock_host_response';

const from = '2022-04-05T12:00:00.000Z';
const to = '2022-04-08T12:00:00.000Z';
const additionalFilters = [{ bool: { filter: [], must: [], must_not: [], should: [] } }];

const dateNow = new Date(to).valueOf();
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

describe('getAlertsQuery', () => {
  test('it returns the expected severity query', () => {
    expect(
      getAlertsQuery({
        from,
        to,
        additionalFilters,
        aggregations: aggregations.severityAgg,
      })
    ).toEqual(severityMock.severityQuery);
  });

  test('it returns the expected detections query', () => {
    expect(
      getAlertsQuery({
        from,
        to,
        additionalFilters,
        aggregations: aggregations.detectionsAgg,
      })
    ).toEqual(detectionMock.detectionsQuery);
  });

  test('it returns the expected host query', () => {
    expect(
      getAlertsQuery({
        from,
        to,
        additionalFilters,
        aggregations: aggregations.hostAgg,
      })
    ).toEqual(hostMock.hostQuery);
  });
});

// helper function to render the hook
const renderUseSummaryChartData = (props: Partial<UseAlertsQueryProps> = {}) =>
  renderHook<UseAlertsQueryProps, ReturnType<UseAlerts>>(
    () =>
      useSummaryChartData({
        aggregationType: 'Severity',
        aggregations: aggregations.severityAgg,
        uniqueQueryId: 'test',
        signalIndexName: 'signal-alerts',
        ...props,
      }),
    {
      wrapper: TestProviders,
    }
  );

describe('get severity chart data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDateNow.mockReturnValue(dateNow);
    mockUseQueryAlerts.mockReturnValue(defaultUseQueryAlertsReturn);
  });

  it('should return default values', () => {
    const { result } = renderUseSummaryChartData();

    expect(result.current).toEqual({
      items: null,
      isLoading: false,
      updatedAt: dateNow,
    });

    expect(mockUseQueryAlerts).toBeCalledWith({
      query: severityMock.severityQuery,
      indexName: 'signal-alerts',
      skip: false,
      queryName: ALERTS_QUERY_NAMES.COUNT,
    });
  });

  it('should return parsed items', () => {
    mockUseQueryAlerts.mockReturnValue({
      ...defaultUseQueryAlertsReturn,
      data: severityMock.mockAlertsData,
    });

    const { result } = renderUseSummaryChartData();
    expect(result.current).toEqual({
      items: severityMock.parsedAlerts,
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
      data: severityMock.mockAlertsData,
    });

    const { result } = renderUseSummaryChartData();

    expect(mockDateNow).toHaveBeenCalled();
    expect(result.current).toEqual({
      items: severityMock.parsedAlerts,
      isLoading: false,
      updatedAt: newDateNow,
    });
  });

  it('should skip the query', () => {
    const { result } = renderUseSummaryChartData({ skip: true });

    expect(mockUseQueryAlerts).toBeCalledWith({
      query: severityMock.severityQuery,
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

  describe('get detections chart data', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockDateNow.mockReturnValue(dateNow);
      mockUseQueryAlerts.mockReturnValue(defaultUseQueryAlertsReturn);
    });
    it('should return default values', () => {
      const { result } = renderUseSummaryChartData({
        aggregations: aggregations.detectionsAgg,
        aggregationType: 'Detections',
      });

      expect(result.current).toEqual({
        items: null,
        isLoading: false,
        updatedAt: dateNow,
      });

      expect(mockUseQueryAlerts).toBeCalledWith({
        query: detectionMock.detectionsQuery,
        indexName: 'signal-alerts',
        skip: false,
        queryName: ALERTS_QUERY_NAMES.COUNT,
      });
    });

    it('should return parsed detections items', () => {
      mockUseQueryAlerts.mockReturnValue({
        ...defaultUseQueryAlertsReturn,
        data: detectionMock.mockAlertsData,
      });

      const { result } = renderUseSummaryChartData({
        aggregations: aggregations.detectionsAgg,
        aggregationType: 'Detections',
      });
      expect(result.current).toEqual({
        items: detectionMock.parsedAlerts,
        isLoading: false,
        updatedAt: dateNow,
      });
    });
  });

  describe('get host chart data', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockDateNow.mockReturnValue(dateNow);
      mockUseQueryAlerts.mockReturnValue(defaultUseQueryAlertsReturn);
    });
    it('should return default values', () => {
      const { result } = renderUseSummaryChartData({
        aggregations: aggregations.hostAgg,
        aggregationType: 'Host',
      });

      expect(result.current).toEqual({
        items: null,
        isLoading: false,
        updatedAt: dateNow,
      });

      expect(mockUseQueryAlerts).toBeCalledWith({
        query: hostMock.hostQuery,
        indexName: 'signal-alerts',
        skip: false,
        queryName: ALERTS_QUERY_NAMES.COUNT,
      });
    });

    it('should return parsed host items', () => {
      mockUseQueryAlerts.mockReturnValue({
        ...defaultUseQueryAlertsReturn,
        data: hostMock.mockAlertsData,
      });

      const { result } = renderUseSummaryChartData({
        aggregations: aggregations.hostAgg,
        aggregationType: 'Host',
      });
      expect(result.current).toEqual({
        items: hostMock.parsedAlerts,
        isLoading: false,
        updatedAt: dateNow,
      });
    });
  });
});
