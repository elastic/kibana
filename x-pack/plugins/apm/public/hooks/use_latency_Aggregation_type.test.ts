/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LatencyAggregationType } from '../../common/latency_aggregation_types';
import { UIFilters } from '../../typings/ui_filters';
import { IUrlParams } from '../context/url_params_context/types';
import * as urlParams from '../context/url_params_context/use_url_params';
import { useLatencyAggregationType } from './use_latency_Aggregation_type';

describe('useLatencyAggregationType', () => {
  afterAll(() => {
    jest.clearAllMocks();
  });
  it('returns avg when no value was given', () => {
    jest.spyOn(urlParams, 'useUrlParams').mockReturnValue({
      urlParams: { latencyAggregationType: undefined } as IUrlParams,
      refreshTimeRange: jest.fn(),
      uiFilters: {} as UIFilters,
    });
    const latencyAggregationType = useLatencyAggregationType();
    expect(latencyAggregationType).toEqual(LatencyAggregationType.avg);
  });

  it('returns avg when no value does not match any of the availabe options', () => {
    jest.spyOn(urlParams, 'useUrlParams').mockReturnValue({
      urlParams: { latencyAggregationType: 'invalid_type' } as IUrlParams,
      refreshTimeRange: jest.fn(),
      uiFilters: {} as UIFilters,
    });
    const latencyAggregationType = useLatencyAggregationType();
    expect(latencyAggregationType).toEqual(LatencyAggregationType.avg);
  });

  it('returns the value in the url', () => {
    jest.spyOn(urlParams, 'useUrlParams').mockReturnValue({
      urlParams: { latencyAggregationType: 'p95' } as IUrlParams,
      refreshTimeRange: jest.fn(),
      uiFilters: {} as UIFilters,
    });
    const latencyAggregationType = useLatencyAggregationType();
    expect(latencyAggregationType).toEqual(LatencyAggregationType.p95);
  });
});
