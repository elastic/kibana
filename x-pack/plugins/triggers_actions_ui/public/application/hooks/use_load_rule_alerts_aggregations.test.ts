/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERTS_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { renderHook, act } from '@testing-library/react-hooks';
import { useKibana } from '../../common/lib/kibana';
import { useLoadRuleAlertsAggs } from './use_load_rule_alerts_aggregations';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
describe('useLoadRuleAlertsAggs', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useKibanaMock().services.http.post = jest.fn().mockResolvedValue({ status: 'ok', data: {} });
  });

  it('should return the expected payload structure even when there is an error', async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useLoadRuleAlertsAggs({
        features: ALERTS_FEATURE_ID,
        ruleId: 'c95bc120-1d56-11ed-9cc7-e7214ada1128',
      })
    );
    await act(async () => {
      await waitForNextUpdate();
    });
    const { ruleAlertsAggs, errorRuleAlertsAggs, alertsChartData } = result.current;
    expect(ruleAlertsAggs).toEqual({
      active: 0,
      recovered: 0,
    });
    expect(errorRuleAlertsAggs).toEqual('error');
    expect(alertsChartData).toEqual([]);
  });
});
