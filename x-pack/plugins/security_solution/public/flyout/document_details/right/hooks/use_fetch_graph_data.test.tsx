/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useFetchGraphData } from './use_fetch_graph_data';

const mockUseQuery = jest.fn();

jest.mock('@tanstack/react-query', () => {
  return {
    useQuery: (...args: unknown[]) => mockUseQuery(...args),
  };
});

describe('useFetchGraphData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Should pass default options when options are not provided', () => {
    renderHook(() => {
      return useFetchGraphData({
        req: {
          query: {
            eventIds: [],
            start: '2021-09-01T00:00:00.000Z',
            end: '2021-09-01T23:59:59.999Z',
          },
        },
      });
    });

    expect(mockUseQuery.mock.calls).toHaveLength(1);
    expect(mockUseQuery.mock.calls[0][2]).toEqual({
      enabled: true,
      refetchOnWindowFocus: true,
    });
  });

  it('Should should not be enabled when enabled set to false', () => {
    renderHook(() => {
      return useFetchGraphData({
        req: {
          query: {
            eventIds: [],
            start: '2021-09-01T00:00:00.000Z',
            end: '2021-09-01T23:59:59.999Z',
          },
        },
        options: {
          enabled: false,
        },
      });
    });

    expect(mockUseQuery.mock.calls).toHaveLength(1);
    expect(mockUseQuery.mock.calls[0][2]).toEqual({
      enabled: false,
      refetchOnWindowFocus: true,
    });
  });

  it('Should should not be refetchOnWindowFocus when refetchOnWindowFocus set to false', () => {
    renderHook(() => {
      return useFetchGraphData({
        req: {
          query: {
            eventIds: [],
            start: '2021-09-01T00:00:00.000Z',
            end: '2021-09-01T23:59:59.999Z',
          },
        },
        options: {
          refetchOnWindowFocus: false,
        },
      });
    });

    expect(mockUseQuery.mock.calls).toHaveLength(1);
    expect(mockUseQuery.mock.calls[0][2]).toEqual({
      enabled: true,
      refetchOnWindowFocus: false,
    });
  });
});
