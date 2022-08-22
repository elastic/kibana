/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { BehaviorSubject, throwError } from 'rxjs';
import { renderHook } from '@testing-library/react-hooks';
import { IKibanaSearchResponse, TimeRangeBounds } from '@kbn/data-plugin/common';
import {
  AGGREGATION_NAME,
  RawAggregatedIndicatorsResponse,
  useAggregatedIndicators,
  UseAggregatedIndicatorsParam,
} from './use_aggregated_indicators';
import { DEFAULT_TIME_RANGE } from './use_filters/utils';
import {
  TestProvidersComponent,
  mockedSearchService,
  mockedTimefilterService,
} from '../../../common/mocks/test_providers';
import { useFilters } from './use_filters';

jest.mock('./use_filters/use_filters');

const aggregationResponse = {
  rawResponse: { aggregations: { [AGGREGATION_NAME]: { buckets: [] } } },
};

const calculateBoundsResponse: TimeRangeBounds = {
  min: moment('1 Jan 2022 06:00:00 GMT'),
  max: moment('1 Jan 2022 12:00:00 GMT'),
};

const useAggregatedIndicatorsParams: UseAggregatedIndicatorsParam = {
  timeRange: DEFAULT_TIME_RANGE,
};

const stub = () => {};

describe('useAggregatedIndicators()', () => {
  beforeEach(jest.clearAllMocks);

  beforeEach(() => {
    mockedSearchService.search.mockReturnValue(new BehaviorSubject(aggregationResponse));
    mockedTimefilterService.timefilter.calculateBounds.mockReturnValue(calculateBoundsResponse);
  });

  describe('when mounted', () => {
    beforeEach(() => {
      (useFilters as jest.MockedFunction<typeof useFilters>).mockReturnValue({
        filters: [],
        filterQuery: { language: 'kuery', query: '' },
        filterManager: {} as any,
        handleSavedQuery: stub,
        handleSubmitQuery: stub,
        handleSubmitTimeRange: stub,
      });

      renderHook(() => useAggregatedIndicators(useAggregatedIndicatorsParams), {
        wrapper: TestProvidersComponent,
      });
    });

    it('should query the database for threat indicators', async () => {
      expect(mockedSearchService.search).toHaveBeenCalledTimes(1);
    });

    it('should use the calculateBounds to convert TimeRange to TimeRangeBounds', () => {
      expect(mockedTimefilterService.timefilter.calculateBounds).toHaveBeenCalledTimes(1);
    });
  });

  describe('when query fails', () => {
    beforeEach(async () => {
      mockedSearchService.search.mockReturnValue(throwError(() => new Error('some random error')));
      mockedTimefilterService.timefilter.calculateBounds.mockReturnValue(calculateBoundsResponse);
    });

    beforeEach(() => {
      renderHook(() => useAggregatedIndicators(useAggregatedIndicatorsParams), {
        wrapper: TestProvidersComponent,
      });
    });

    it('should show an error', async () => {
      expect(mockedSearchService.showError).toHaveBeenCalledTimes(1);

      expect(mockedSearchService.search).toHaveBeenCalledWith(
        expect.objectContaining({
          params: expect.objectContaining({
            body: expect.objectContaining({
              aggregations: expect.any(Object),
              query: expect.any(Object),
              size: expect.any(Number),
              fields: expect.any(Array),
            }),
          }),
        }),
        expect.objectContaining({
          abortSignal: expect.any(AbortSignal),
        })
      );
    });
  });

  describe('when query is successful', () => {
    beforeEach(async () => {
      mockedSearchService.search.mockReturnValue(
        new BehaviorSubject<IKibanaSearchResponse<RawAggregatedIndicatorsResponse>>({
          rawResponse: {
            aggregations: {
              [AGGREGATION_NAME]: {
                buckets: [
                  {
                    doc_count: 1,
                    key: '[Filebeat] AbuseCH Malware',
                    events: {
                      buckets: [
                        {
                          doc_count: 0,
                          key: 1641016800000,
                          key_as_string: '1 Jan 2022 06:00:00 GMT',
                        },
                      ],
                    },
                  },
                ],
              },
            },
          },
        })
      );
      mockedTimefilterService.timefilter.calculateBounds.mockReturnValue(calculateBoundsResponse);
    });

    it('should call mapping function on every hit', async () => {
      const { result } = renderHook(() => useAggregatedIndicators(useAggregatedIndicatorsParams), {
        wrapper: TestProvidersComponent,
      });

      expect(result.current.indicators.length).toEqual(1);
    });
  });
});
