/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useKibana } from '../../../common/lib/kibana';
import { useMatrixHistogram, useMatrixHistogramCombined } from '.';
import { MatrixHistogramType } from '../../../../common/search_strategy';
import { TestProviders } from '../../mock/test_providers';

jest.mock('../../../common/lib/kibana');

const basicResponse = {
  isPartial: false,
  isRunning: false,
  total: 0,
  loaded: 0,
  rawResponse: {
    took: 1,
    timed_out: false,
    hits: {
      max_score: 0,
      hits: [],
      total: 0,
    },
  },
};

describe('useMatrixHistogram', () => {
  const props = {
    endDate: new Date(Date.now()).toISOString(),
    errorMessage: '',
    filterQuery: {},
    histogramType: MatrixHistogramType.events,
    indexNames: [],
    stackByField: 'event.module',
    startDate: new Date(Date.now()).toISOString(),
    skip: false,
  };

  afterEach(() => {
    (useKibana().services.data.search.search as jest.Mock).mockClear();
  });

  it('should update request when props has changed', async () => {
    const localProps = { ...props };
    const { rerender } = renderHook(() => useMatrixHistogram(localProps), {
      wrapper: TestProviders,
    });

    localProps.stackByField = 'event.action';

    rerender();

    const mockCalls = (useKibana().services.data.search.search as jest.Mock).mock.calls;

    expect(mockCalls.length).toBe(2);
    expect(mockCalls[0][0].stackByField).toBe('event.module');
    expect(mockCalls[1][0].stackByField).toBe('event.action');
  });

  it('returns a memoized value', async () => {
    const { result, rerender } = renderHook(() => useMatrixHistogram(props), {
      wrapper: TestProviders,
    });

    const result1 = result.current[1];
    act(() => rerender());
    const result2 = result.current[1];

    expect(result1).toBe(result2);
  });

  it("returns buckets for histogram Type 'events'", async () => {
    const localProps = { ...props, histogramType: MatrixHistogramType.events };
    const mockEventsSearchStrategyResponse = {
      ...basicResponse,
      rawResponse: {
        ...basicResponse.rawResponse,
        aggregations: {
          eventActionGroup: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'my dsn test buckets',
                doc_count: 1,
              },
            ],
          },
        },
      },
    };

    (useKibana().services.data.search.search as jest.Mock).mockReturnValueOnce({
      subscribe: ({ next }: { next: Function }) => next(mockEventsSearchStrategyResponse),
    });

    const {
      result: { current },
    } = renderHook(() => useMatrixHistogram(localProps), {
      wrapper: TestProviders,
    });

    expect(current[1].buckets).toBe(
      mockEventsSearchStrategyResponse.rawResponse.aggregations?.eventActionGroup.buckets
    );
  });

  it("returns buckets for histogram Type 'dns'", async () => {
    const mockDnsSearchStrategyResponse = {
      ...basicResponse,
      rawResponse: {
        ...basicResponse.rawResponse,
        aggregations: {
          dns_name_query_count: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              {
                key: 'my dsn test buckets',
                doc_count: 1,
              },
            ],
          },
        },
      },
    };

    const localProps = { ...props, histogramType: MatrixHistogramType.dns };
    (useKibana().services.data.search.search as jest.Mock).mockReturnValueOnce({
      subscribe: ({ next }: { next: Function }) => next(mockDnsSearchStrategyResponse),
    });

    const {
      result: { current },
    } = renderHook(() => useMatrixHistogram(localProps), {
      wrapper: TestProviders,
    });

    expect(current[1].buckets).toBe(
      mockDnsSearchStrategyResponse.rawResponse.aggregations?.dns_name_query_count.buckets
    );
  });

  it('skip = true will cancel any running request', () => {
    const abortSpy = jest.spyOn(AbortController.prototype, 'abort');
    const localProps = { ...props };
    const { rerender } = renderHook(() => useMatrixHistogram(localProps), {
      wrapper: TestProviders,
    });
    localProps.skip = true;
    act(() => rerender());
    expect(abortSpy).toHaveBeenCalledTimes(3);
  });
});

describe('useMatrixHistogramCombined', () => {
  const props = {
    endDate: new Date(Date.now()).toISOString(),
    errorMessage: '',
    filterQuery: {},
    histogramType: MatrixHistogramType.events,
    indexNames: [],
    stackByField: 'event.module',
    startDate: new Date(Date.now()).toISOString(),
  };

  afterEach(() => {
    (useKibana().services.data.search.search as jest.Mock).mockClear();
  });

  it('should update request when props has changed', async () => {
    const localProps = { ...props };
    const { rerender } = renderHook(() => useMatrixHistogramCombined(localProps), {
      wrapper: TestProviders,
    });

    localProps.stackByField = 'event.action';

    rerender();

    const mockCalls = (useKibana().services.data.search.search as jest.Mock).mock.calls;

    expect(mockCalls.length).toBe(2);
    expect(mockCalls[0][0].stackByField).toBe('event.module');
    expect(mockCalls[1][0].stackByField).toBe('event.action');
  });

  it('should do two request when stacking by ip field', async () => {
    const localProps = { ...props, stackByField: 'source.ip' };
    renderHook(() => useMatrixHistogramCombined(localProps), {
      wrapper: TestProviders,
    });

    const mockCalls = (useKibana().services.data.search.search as jest.Mock).mock.calls;

    expect(mockCalls.length).toBe(2);
    expect(mockCalls[0][0].stackByField).toBe('source.ip');
    expect(mockCalls[1][0].stackByField).toBe('source.ip');
  });

  it('returns a memoized value', async () => {
    const { result, rerender } = renderHook(() => useMatrixHistogramCombined(props), {
      wrapper: TestProviders,
    });

    const result1 = result.current[1];
    act(() => rerender());
    const result2 = result.current[1];

    expect(result1).toBe(result2);
  });
});
