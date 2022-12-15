/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { renderHook } from '@testing-library/react-hooks';
import { useKibana } from '../../common/lib/kibana';
import { mockAggsResponse, mockAlertSummaryTimeRange } from '../mock/alert_summary_widget';
import { useLoadAlertSummary } from './use_load_alert_summary';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
describe('useLoadRuleAlertsAggs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.http.post = jest.fn().mockResolvedValue({ ...mockAggsResponse() });
    useKibanaMock().services.http.get = jest.fn().mockResolvedValue({ index_name: ['mock_index'] });
  });

  it('should return the expected data from the Elasticsearch Aggs. query', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useLoadAlertSummary({
        features: ALERTS_FEATURE_ID,
        timeRange: mockAlertSummaryTimeRange,
      })
    );
    expect(result.current).toEqual({
      isLoading: true,
      alertSummary: { active: 0, recovered: 0 },
    });

    await waitForNextUpdate();
    const { alertSummary, error } = result.current;
    expect(alertSummary).toEqual({
      active: 1,
      recovered: 7,
    });
    expect(error).toBeFalsy();
  });

  it('should have the correct query body sent to Elasticsearch', async () => {
    const ruleId = 'c95bc120-1d56-11ed-9cc7-e7214ada1128';
    const { utcFrom, utcTo } = mockAlertSummaryTimeRange;
    const filter = {
      term: {
        'kibana.alert.rule.uuid': ruleId,
      },
    };
    const { waitForNextUpdate } = renderHook(() =>
      useLoadAlertSummary({
        features: ALERTS_FEATURE_ID,
        timeRange: mockAlertSummaryTimeRange,
        filter,
      })
    );

    await waitForNextUpdate();
    const body =
      `{"index":"mock_index","size":0,` +
      `"query":{"bool":{"filter":[{"range":{"@timestamp":{"gte":"${utcFrom}","lt":"${utcTo}"}}},` +
      `{"bool":{"should":[{"term":{"kibana.alert.status":"active"}},{"term":{"kibana.alert.status":"recovered"}}]}},` +
      `{"term":{"kibana.alert.rule.uuid":"c95bc120-1d56-11ed-9cc7-e7214ada1128"}}]}},` +
      `"aggs":{"total":{"filters":{"filters":{"totalActiveAlerts":{"term":{"kibana.alert.status":"active"}},"totalRecoveredAlerts":{"term":{"kibana.alert.status":"recovered"}}}}}}}`;

    expect(useKibanaMock().services.http.post).toHaveBeenCalledWith(
      '/internal/rac/alerts/find',
      expect.objectContaining({
        body,
      })
    );
  });
});
