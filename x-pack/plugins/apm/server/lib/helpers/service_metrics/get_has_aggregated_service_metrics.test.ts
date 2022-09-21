/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSearchAggregatedServiceMetrics } from '.';
import {
  SearchParamsMock,
  inspectSearchParams,
} from '../../../utils/test_helpers';
import { Setup } from '../setup_request';

const mockResponseWithServiceMetricsHits = {
  took: 398,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 1,
      relation: 'gte' as const,
    },
    hits: [],
  },
};

const mockResponseWithServiceMetricsNoHits = {
  took: 398,
  timed_out: false,
  _shards: {
    total: 1,
    successful: 1,
    skipped: 0,
    failed: 0,
  },
  hits: {
    total: {
      value: 0,
      relation: 'gte' as const,
    },
    hits: [],
  },
};

describe('get default configuration for aggregated service metrics', () => {
  it('should be false by default', async () => {
    const mockSetup = {
      apmEventClient: { search: () => Promise.resolve(response) },
      config: {},
    } as unknown as Setup;

    const response = await getSearchAggregatedServiceMetrics({
      apmEventClient: mockSetup.apmEventClient,
      config: mockSetup.config,
      kuery: '',
    });
    expect(response).toBeFalsy();
  });
});

describe('get has aggregated', () => {
  it('should be false when xpack.apm.searchAggregatedServiceMetrics=false ', async () => {
    const mockSetup = {
      apmEventClient: { search: () => Promise.resolve(response) },
      config: { 'xpack.apm.searchAggregatedServiceMetrics': false },
    } as unknown as Setup;

    const response = await getSearchAggregatedServiceMetrics({
      apmEventClient: mockSetup.apmEventClient,
      config: mockSetup.config,
      kuery: '',
    });
    expect(response).toBeFalsy();
  });

  describe('with xpack.apm.searchAggregatedServiceMetrics=true', () => {
    let mock: SearchParamsMock;

    const config = {
      searchAggregatedServiceMetrics: true,
    };

    afterEach(() => {
      mock.teardown();
    });
    it('should be true when service metrics data are found', async () => {
      mock = await inspectSearchParams(
        (setup) =>
          getSearchAggregatedServiceMetrics({
            apmEventClient: setup.apmEventClient,
            config: setup.config,
            kuery: '',
          }),
        {
          config,
          mockResponse: () => mockResponseWithServiceMetricsHits,
        }
      );
      expect(mock.response).toBeTruthy();
    });

    it('should be false when service metrics data are not found', async () => {
      mock = await inspectSearchParams(
        (setup) =>
          getSearchAggregatedServiceMetrics({
            apmEventClient: setup.apmEventClient,
            config: setup.config,
            kuery: '',
          }),
        {
          config,
          mockResponse: () => mockResponseWithServiceMetricsNoHits,
        }
      );
      expect(mock.response).toBeFalsy();
    });
  });
});
