/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getSetupMock } from '../../../testHelpers/mocks';
import { fetchMetrics } from '../metricsFetcher';

describe('APM metrics ES fetcher', () => {
  it('should fetch metrics with specified aggregations', () => {
    const mockSetup = getSetupMock();
    const timeseriesBucketAggregations = {};
    const totalAggregations = { a: 1, b: 2, c: 3 };
    mockSetup.config.get.mockReturnValue('configurable-apm-metrics-index');

    fetchMetrics({
      setup: mockSetup,
      serviceName: 'test-service',
      timeseriesBucketAggregations,
      totalAggregations
    });

    expect(mockSetup.client).toHaveBeenCalledTimes(1);
    expect(
      mockSetup.client.mock.calls[0][1].body.aggs.timeseriesData.aggs
    ).toBe(timeseriesBucketAggregations);
    expect(mockSetup.client.mock.calls).toMatchSnapshot();
  });
});
