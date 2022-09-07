/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { renderHook } from '@testing-library/react-hooks';
import { useKibana } from '../../common/lib/kibana';
import { useLoadRuleAlertsAggs } from './use_load_rule_alerts_aggregations';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
describe('useLoadRuleAlertsAggs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.http.post = jest.fn().mockResolvedValue({ ...mockAggsResponse() });
    useKibanaMock().services.http.get = jest.fn().mockResolvedValue({ index_name: ['mock_index'] });
  });

  it('should return the expected chart data from the Elasticsearch Aggs. query', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useLoadRuleAlertsAggs({
        features: ALERTS_FEATURE_ID,
        ruleId: 'c95bc120-1d56-11ed-9cc7-e7214ada1128',
      })
    );
    expect(result.current).toEqual({
      isLoadingRuleAlertsAggs: true,
      ruleAlertsAggs: { active: 0, recovered: 0 },
      alertsChartData: [],
    });

    await waitForNextUpdate();
    const { ruleAlertsAggs, errorRuleAlertsAggs, alertsChartData } = result.current;
    expect(ruleAlertsAggs).toEqual({
      active: 1,
      recovered: 7,
    });
    expect(alertsChartData).toEqual(mockChartData());
    expect(errorRuleAlertsAggs).toBeFalsy();
    expect(alertsChartData.length).toEqual(33);
  });

  it('should have the correct query body sent to Elasticsearch', async () => {
    const ruleId = 'c95bc120-1d56-11ed-9cc7-e7214ada1128';
    const { waitForNextUpdate } = renderHook(() =>
      useLoadRuleAlertsAggs({
        features: ALERTS_FEATURE_ID,
        ruleId,
      })
    );

    await waitForNextUpdate();
    const body = `{"index":"mock_index","size":0,"query":{"bool":{"must":[{"term":{"kibana.alert.rule.uuid":"${ruleId}"}},{"range":{"@timestamp":{"gte":"now-30d","lt":"now"}}},{"bool":{"should":[{"term":{"kibana.alert.status":"active"}},{"term":{"kibana.alert.status":"recovered"}}]}}]}},"aggs":{"total":{"filters":{"filters":{"totalActiveAlerts":{"term":{"kibana.alert.status":"active"}},"totalRecoveredAlerts":{"term":{"kibana.alert.status":"recovered"}}}}},"statusPerDay":{"date_histogram":{"field":"@timestamp","fixed_interval":"1d","extended_bounds":{"min":"now-30d","max":"now"}},"aggs":{"alertStatus":{"terms":{"field":"kibana.alert.status"}}}}}}`;

    expect(useKibanaMock().services.http.post).toHaveBeenCalledWith(
      '/internal/rac/alerts/find',
      expect.objectContaining({
        body,
      })
    );
  });
});

function mockAggsResponse() {
  return {
    aggregations: {
      total: {
        buckets: { totalActiveAlerts: { doc_count: 1 }, totalRecoveredAlerts: { doc_count: 7 } },
      },
      statusPerDay: {
        buckets: [
          {
            key_as_string: '2022-07-18T00:00:00.000Z',
            key: 1658102400000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-19T00:00:00.000Z',
            key: 1658188800000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-20T00:00:00.000Z',
            key: 1658275200000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-21T00:00:00.000Z',
            key: 1658361600000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-22T00:00:00.000Z',
            key: 1658448000000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-23T00:00:00.000Z',
            key: 1658534400000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-24T00:00:00.000Z',
            key: 1658620800000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-25T00:00:00.000Z',
            key: 1658707200000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-26T00:00:00.000Z',
            key: 1658793600000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-27T00:00:00.000Z',
            key: 1658880000000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-28T00:00:00.000Z',
            key: 1658966400000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-29T00:00:00.000Z',
            key: 1659052800000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-30T00:00:00.000Z',
            key: 1659139200000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-07-31T00:00:00.000Z',
            key: 1659225600000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-01T00:00:00.000Z',
            key: 1659312000000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-02T00:00:00.000Z',
            key: 1659398400000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-03T00:00:00.000Z',
            key: 1659484800000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-04T00:00:00.000Z',
            key: 1659571200000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-05T00:00:00.000Z',
            key: 1659657600000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-06T00:00:00.000Z',
            key: 1659744000000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-07T00:00:00.000Z',
            key: 1659830400000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-08T00:00:00.000Z',
            key: 1659916800000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-09T00:00:00.000Z',
            key: 1660003200000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-10T00:00:00.000Z',
            key: 1660089600000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-11T00:00:00.000Z',
            key: 1660176000000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-12T00:00:00.000Z',
            key: 1660262400000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-13T00:00:00.000Z',
            key: 1660348800000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-14T00:00:00.000Z',
            key: 1660435200000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-15T00:00:00.000Z',
            key: 1660521600000,
            doc_count: 0,
            alertStatus: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
          {
            key_as_string: '2022-08-16T00:00:00.000Z',
            key: 1660608000000,
            doc_count: 6,
            alertStatus: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [{ key: 'recovered', doc_count: 6 }],
            },
          },
          {
            key_as_string: '2022-08-17T00:00:00.000Z',
            key: 1660694400000,
            doc_count: 2,
            alertStatus: {
              doc_count_error_upper_bound: 0,
              sum_other_doc_count: 0,
              buckets: [
                { key: 'active', doc_count: 1 },
                { key: 'recovered', doc_count: 1 },
              ],
            },
          },
        ],
      },
    },
  };
}

function mockChartData() {
  return [
    { date: 1660608000000, count: 6, status: 'recovered' },
    { date: 1660694400000, count: 1, status: 'recovered' },
    { date: 1660694400000, count: 1, status: 'active' },
    { date: 1658102400000, count: 6, status: 'total' },
    { date: 1658188800000, count: 6, status: 'total' },
    { date: 1658275200000, count: 6, status: 'total' },
    { date: 1658361600000, count: 6, status: 'total' },
    { date: 1658448000000, count: 6, status: 'total' },
    { date: 1658534400000, count: 6, status: 'total' },
    { date: 1658620800000, count: 6, status: 'total' },
    { date: 1658707200000, count: 6, status: 'total' },
    { date: 1658793600000, count: 6, status: 'total' },
    { date: 1658880000000, count: 6, status: 'total' },
    { date: 1658966400000, count: 6, status: 'total' },
    { date: 1659052800000, count: 6, status: 'total' },
    { date: 1659139200000, count: 6, status: 'total' },
    { date: 1659225600000, count: 6, status: 'total' },
    { date: 1659312000000, count: 6, status: 'total' },
    { date: 1659398400000, count: 6, status: 'total' },
    { date: 1659484800000, count: 6, status: 'total' },
    { date: 1659571200000, count: 6, status: 'total' },
    { date: 1659657600000, count: 6, status: 'total' },
    { date: 1659744000000, count: 6, status: 'total' },
    { date: 1659830400000, count: 6, status: 'total' },
    { date: 1659916800000, count: 6, status: 'total' },
    { date: 1660003200000, count: 6, status: 'total' },
    { date: 1660089600000, count: 6, status: 'total' },
    { date: 1660176000000, count: 6, status: 'total' },
    { date: 1660262400000, count: 6, status: 'total' },
    { date: 1660348800000, count: 6, status: 'total' },
    { date: 1660435200000, count: 6, status: 'total' },
    { date: 1660521600000, count: 6, status: 'total' },
    { date: 1660694400000, count: 4, status: 'total' },
  ];
}
