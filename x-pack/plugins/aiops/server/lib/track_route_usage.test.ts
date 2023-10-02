/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { trackAIOpsRouteUsage } from './track_route_usage';

describe('trackAIOpsRouteUsage', () => {
  it('should call `usageCounter.incrementCounter`', () => {
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    trackAIOpsRouteUsage('test_type', 'test_source', mockUsageCounter);
    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'test_type',
      counterType: 'run_via_test_source',
      incrementBy: 1,
    });
  });

  it('should do nothing if no usage counter is provided', () => {
    let err;
    try {
      trackAIOpsRouteUsage('test', undefined);
    } catch (e) {
      err = e;
    }
    expect(err).toBeUndefined();
  });
});
