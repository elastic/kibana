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
import { mockKibanaDataService } from '../../../common/mocks/mock_kibana_data_service';
import { DEFAULT_THREAT_INDEX_KEY } from '../../../../common/constants';
import {
  AGGREGATION_NAME,
  RawAggregatedIndicatorsResponse,
  useAggregatedIndicators,
  UseAggregatedIndicatorsParam,
} from './use_aggregated_indicators';
import { DEFAULT_TIME_RANGE } from './use_filters/utils';

jest.mock('../../../hooks/use_kibana');

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

describe('useAggregatedIndicators()', () => {
  let mockData: ReturnType<typeof mockKibanaDataService>;

  describe('when mounted', () => {
    beforeEach(() => {
      mockData = mockKibanaDataService({
        searchSubject: new BehaviorSubject(aggregationResponse),
        calculateSubject: calculateBoundsResponse,
      });
    });

    beforeEach(async () => {
      renderHook(() => useAggregatedIndicators(useAggregatedIndicatorsParams));
    });

    it('should query the database for threat indicators', async () => {
      expect(mockData.search).toHaveBeenCalledTimes(1);
    });

    it('should retrieve index patterns from settings', () => {
      expect(mockData.getUiSetting).toHaveBeenCalledWith(DEFAULT_THREAT_INDEX_KEY);
    });

    it('should use the calculateBounds to convert TimeRange to TimeRangeBounds', () => {
      expect(mockData.calculateBounds).toHaveBeenCalledTimes(1);
    });
  });

  describe('when query fails', () => {
    beforeEach(async () => {
      mockData = mockKibanaDataService({
        searchSubject: throwError(() => new Error('some random error')),
        calculateSubject: calculateBoundsResponse,
      });

      renderHook(() => useAggregatedIndicators(useAggregatedIndicatorsParams));
    });

    it('should show an error', async () => {
      expect(mockData.showError).toHaveBeenCalledTimes(1);

      expect(mockData.search).toHaveBeenCalledWith(
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
      mockData = mockKibanaDataService({
        searchSubject: new BehaviorSubject<IKibanaSearchResponse<RawAggregatedIndicatorsResponse>>({
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
        }),
        calculateSubject: calculateBoundsResponse,
      });
    });

    it('should call mapping function on every hit', async () => {
      const { result } = renderHook(() => useAggregatedIndicators(useAggregatedIndicatorsParams));

      expect(result.current.indicators.length).toEqual(1);
    });
  });
});
