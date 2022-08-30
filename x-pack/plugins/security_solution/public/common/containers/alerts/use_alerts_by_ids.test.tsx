/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useQueryAlerts } from '../../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../detections/containers/detection_engine/alerts/constants';
import { useAlertsByIds } from './use_alerts_by_ids';

jest.mock('../../../detections/containers/detection_engine/alerts/use_query', () => ({
  useQueryAlerts: jest.fn(),
}));
const mockUseQueryAlerts = useQueryAlerts as jest.Mock;

const alertIds = ['1', '2', '3'];
const testResult = {
  hits: {
    hits: [{ result: 1 }, { result: 2 }],
  },
};

describe('useAlertsByIds', () => {
  beforeEach(() => {
    mockUseQueryAlerts.mockReset();
  });

  it('passes down the loading state', () => {
    mockUseQueryAlerts.mockReturnValue({
      loading: true,
      setQuery: jest.fn(),
    });

    const { result } = renderHook(() => useAlertsByIds({ alertIds }));

    expect(result.current).toEqual({ loading: true, error: false });
  });

  it('calculates the error state', () => {
    mockUseQueryAlerts.mockReturnValue({
      loading: false,
      data: undefined,
      setQuery: jest.fn(),
    });

    const { result } = renderHook(() => useAlertsByIds({ alertIds }));

    expect(result.current).toEqual({ loading: false, error: true, data: undefined });
  });

  it('returns the results', () => {
    mockUseQueryAlerts.mockReturnValue({
      loading: false,
      data: testResult,
      setQuery: jest.fn(),
    });

    const { result } = renderHook(() => useAlertsByIds({ alertIds }));

    expect(result.current).toEqual({ loading: false, error: false, data: testResult.hits.hits });
  });

  it('constructs the correct query', () => {
    mockUseQueryAlerts.mockReturnValue({
      loading: true,
      setQuery: jest.fn(),
    });

    renderHook(() => useAlertsByIds({ alertIds }));

    expect(mockUseQueryAlerts).toHaveBeenCalledWith({
      queryName: ALERTS_QUERY_NAMES.BY_ID,
      query: expect.objectContaining({
        fields: ['*'],
        _source: false,
        query: {
          ids: {
            values: alertIds,
          },
        },
      }),
    });
  });

  it('requests the specified fields', () => {
    const testFields = ['test.*'];
    mockUseQueryAlerts.mockReturnValue({
      loading: true,
      setQuery: jest.fn(),
    });

    renderHook(() => useAlertsByIds({ alertIds, fields: testFields }));

    expect(mockUseQueryAlerts).toHaveBeenCalledWith({
      queryName: ALERTS_QUERY_NAMES.BY_ID,
      query: expect.objectContaining({ fields: testFields }),
    });
  });
});
