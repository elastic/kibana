/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';
import { useKibana } from '../../common/lib/kibana';
import {
  mockedAlertSummaryResponse,
  mockedAlertSummaryTimeRange,
} from '../mock/alert_summary_widget';
import { useLoadAlertSummary } from './use_load_alert_summary';

jest.mock('../../common/lib/kibana');

const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
describe('useLoadAlertSummary', () => {
  const ruleTypeIds: string[] = ['apm'];
  const mockedPostAPI = jest.fn();

  beforeAll(() => {
    useKibanaMock().services.http.post = mockedPostAPI;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return the mocked data from API', async () => {
    mockedPostAPI.mockResolvedValue({
      ...mockedAlertSummaryResponse,
    });

    const { result } = renderHook(() =>
      useLoadAlertSummary({
        ruleTypeIds,
        timeRange: mockedAlertSummaryTimeRange,
      })
    );
    expect(result.current).toEqual({
      isLoading: true,
      alertSummary: {
        activeAlertCount: 0,
        activeAlerts: [],
        recoveredAlertCount: 0,
      },
    });

    await waitFor(() => new Promise((resolve) => resolve(null)));

    const { alertSummary, error } = result.current;
    expect(alertSummary).toEqual({
      ...mockedAlertSummaryResponse,
    });
    expect(error).toBeFalsy();
  });

  it('should call API with correct input', async () => {
    const ruleId = 'c95bc120-1d56-11ed-9cc7-e7214ada1128';
    const { utcFrom, utcTo, fixedInterval } = mockedAlertSummaryTimeRange;
    const filter = {
      term: {
        'kibana.alert.rule.uuid': ruleId,
      },
    };
    mockedPostAPI.mockResolvedValue({
      ...mockedAlertSummaryResponse,
    });

    renderHook(() =>
      useLoadAlertSummary({
        ruleTypeIds,
        timeRange: mockedAlertSummaryTimeRange,
        filter,
      })
    );

    const body = JSON.stringify({
      fixed_interval: fixedInterval,
      gte: utcFrom,
      lte: utcTo,
      ruleTypeIds,
      filter: [filter],
    });

    await waitFor(() =>
      expect(mockedPostAPI).toHaveBeenCalledWith(
        '/internal/rac/alerts/_alert_summary',
        expect.objectContaining({
          body,
        })
      )
    );
  });

  it('should return error if API call fails', async () => {
    const error = new Error('Fetch Alert Summary Failed');
    mockedPostAPI.mockRejectedValueOnce(error);

    const { result } = renderHook(() =>
      useLoadAlertSummary({
        ruleTypeIds,
        timeRange: mockedAlertSummaryTimeRange,
      })
    );

    await waitFor(() => expect(result.current.error).toMatch(error.message));
  });
});
