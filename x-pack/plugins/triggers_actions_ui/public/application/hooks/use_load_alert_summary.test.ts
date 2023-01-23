/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { ValidFeatureId } from '@kbn/rule-data-utils';
import { useKibana } from '../../common/lib/kibana';
import { mockAlertSummaryResponse, mockAlertSummaryTimeRange } from '../mock/alert_summary_widget';
import { useLoadAlertSummary } from './use_load_alert_summary';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
describe('useLoadAlertSummary', () => {
  const featureIds: ValidFeatureId[] = ['apm'];
  const mockedPostAPI = jest.fn();

  beforeAll(() => {
    useKibanaMock().services.http.post = mockedPostAPI;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the mocked data from API', async () => {
    mockedPostAPI.mockResolvedValue({
      ...mockAlertSummaryResponse(),
    });

    const { result, waitForNextUpdate } = renderHook(() =>
      useLoadAlertSummary({
        featureIds,
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
      recovered: 1,
    });
    expect(error).toBeFalsy();
  });

  it('should call API with correct input', async () => {
    const ruleId = 'c95bc120-1d56-11ed-9cc7-e7214ada1128';
    const { utcFrom, utcTo, fixedInterval } = mockAlertSummaryTimeRange;
    const filter = {
      term: {
        'kibana.alert.rule.uuid': ruleId,
      },
    };
    mockedPostAPI.mockResolvedValue({
      ...mockAlertSummaryResponse(),
    });

    const { waitForNextUpdate } = renderHook(() =>
      useLoadAlertSummary({
        featureIds,
        timeRange: mockAlertSummaryTimeRange,
        filter,
      })
    );

    await waitForNextUpdate();

    const body = JSON.stringify({
      fixed_interval: fixedInterval,
      gte: utcFrom,
      lte: utcTo,
      featureIds,
      filter: [filter],
    });
    expect(mockedPostAPI).toHaveBeenCalledWith(
      '/internal/rac/alerts/_alert_summary',
      expect.objectContaining({
        body,
      })
    );
  });

  it('should return error if API call fails', async () => {
    const error = new Error('Fetch Alert Summary Failed');
    mockedPostAPI.mockRejectedValueOnce(error);

    const { result, waitForNextUpdate } = renderHook(() =>
      useLoadAlertSummary({
        featureIds,
        timeRange: mockAlertSummaryTimeRange,
      })
    );

    await waitForNextUpdate();

    expect(result.current.error).toMatch(error.message);
  });
});
