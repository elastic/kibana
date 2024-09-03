/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { TestProviders } from '../../../../common/mock';
import { ALERTS_QUERY_NAMES } from '../../../containers/detection_engine/alerts/constants';
import type { UseAlerts, UseAlertsQueryProps } from './use_summary_chart_data';
import { useSummaryChartData, getAlertsQuery } from './use_summary_chart_data';
import * as aggregations from './aggregations';
import * as severityMock from '../severity_level_panel/mock_data';
import * as alertRuleMock from '../alerts_by_rule_panel/mock_rule_data';
import * as alertsGroupingMock from '../alerts_progress_bar_panel/mock_data';

const from = '2022-04-05T12:00:00.000Z';
const to = '2022-04-08T12:00:00.000Z';
const additionalFilters = [{ bool: { filter: [], must: [], must_not: [], should: [] } }];

const dateNow = new Date(to).valueOf();
const mockDateNow = jest.fn().mockReturnValue(dateNow);
Date.now = jest.fn(() => mockDateNow()) as unknown as DateConstructor['now'];

jest.mock('../../../../common/lib/kibana');

const defaultUseQueryAlertsReturn = {
  loading: false,
  data: null,
  setQuery: () => {},
  response: '',
  request: '',
  refetch: () => {},
};
const mockUseQueryAlerts = jest.fn().mockReturnValue(defaultUseQueryAlertsReturn);
jest.mock('../../../containers/detection_engine/alerts/use_query', () => {
  return {
    useQueryAlerts: (...props: unknown[]) => mockUseQueryAlerts(...props),
  };
});

const mockUseGlobalTime = jest
  .fn()
  .mockReturnValue({ from, to, setQuery: jest.fn(), deleteQuery: jest.fn() });
jest.mock('../../../../common/containers/use_global_time', () => {
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
        aggregations: aggregations.severityAggregations,
      })
    ).toEqual(severityMock.query);
  });

  test('it returns the expected alerts by grouping query', () => {
    expect(
      getAlertsQuery({
        from,
        to,
        additionalFilters,
        aggregations: aggregations.alertsGroupingAggregations('host.name'),
      })
    ).toEqual(alertsGroupingMock.query);
  });
});

// helper function to render the hook
const renderUseSummaryChartData = (props: Partial<UseAlertsQueryProps> = {}) =>
  renderHook<UseAlertsQueryProps, ReturnType<UseAlerts>>(
    () =>
      useSummaryChartData({
        aggregations: aggregations.severityAggregations,
        uniqueQueryId: 'test',
        signalIndexName: 'signal-alerts',
        ...props,
      }),
    {
      wrapper: TestProviders,
    }
  );

describe('get summary charts data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDateNow.mockReturnValue(dateNow);
    mockUseQueryAlerts.mockReturnValue(defaultUseQueryAlertsReturn);
  });

  it('should return default values', () => {
    const { result } = renderUseSummaryChartData();

    expect(result.current).toEqual({
      items: [],
      isLoading: false,
      updatedAt: dateNow,
    });

    expect(mockUseQueryAlerts).toBeCalledWith({
      query: severityMock.query,
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
      query: severityMock.query,
      indexName: 'signal-alerts',
      skip: true,
      queryName: ALERTS_QUERY_NAMES.COUNT,
    });

    expect(result.current).toEqual({
      items: [],
      isLoading: false,
      updatedAt: dateNow,
    });
  });

  describe('get alerts by rule data', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockDateNow.mockReturnValue(dateNow);
      mockUseQueryAlerts.mockReturnValue(defaultUseQueryAlertsReturn);
    });

    it('should return correct default values', () => {
      const { result } = renderUseSummaryChartData({
        aggregations: aggregations.alertRuleAggregations,
      });

      expect(result.current).toEqual({
        items: [],
        isLoading: false,
        updatedAt: dateNow,
      });

      expect(mockUseQueryAlerts).toBeCalledWith({
        query: alertRuleMock.query,
        indexName: 'signal-alerts',
        skip: false,
        queryName: ALERTS_QUERY_NAMES.COUNT,
      });
    });

    it('should return parsed alerts by type items', () => {
      mockUseQueryAlerts.mockReturnValue({
        ...defaultUseQueryAlertsReturn,
        data: alertRuleMock.mockAlertsData,
      });

      const { result } = renderUseSummaryChartData({
        aggregations: aggregations.alertRuleAggregations,
      });
      expect(result.current).toEqual({
        items: alertRuleMock.parsedAlerts,
        isLoading: false,
        updatedAt: dateNow,
      });
    });
  });

  describe('get top alerts data', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      mockDateNow.mockReturnValue(dateNow);
      mockUseQueryAlerts.mockReturnValue(defaultUseQueryAlertsReturn);
    });
    it('should return default values', () => {
      const { result } = renderUseSummaryChartData({
        aggregations: aggregations.alertsGroupingAggregations('host.name'),
      });

      expect(result.current).toEqual({
        items: [],
        isLoading: false,
        updatedAt: dateNow,
      });

      expect(mockUseQueryAlerts).toBeCalledWith({
        query: alertsGroupingMock.query,
        indexName: 'signal-alerts',
        skip: false,
        queryName: ALERTS_QUERY_NAMES.COUNT,
      });
    });

    it('should return parsed top alert items', () => {
      mockUseQueryAlerts.mockReturnValue({
        ...defaultUseQueryAlertsReturn,
        data: alertsGroupingMock.mockAlertsData,
      });

      const { result } = renderUseSummaryChartData({
        aggregations: aggregations.alertsGroupingAggregations('host.name'),
      });
      expect(result.current).toEqual({
        items: alertsGroupingMock.parsedAlerts,
        isLoading: false,
        updatedAt: dateNow,
      });
    });
  });
});
