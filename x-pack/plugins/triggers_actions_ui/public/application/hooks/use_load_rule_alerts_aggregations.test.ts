/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { renderHook } from '@testing-library/react-hooks';
import { useKibana } from '../../common/lib/kibana';
import { mockAggsResponse, mockChartData } from '../mock/rule_details/alert_summary';
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
