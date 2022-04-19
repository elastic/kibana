/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { trackLegacyRBACExemption } from './track_legacy_rbac_exemption';

describe('trackLegacyRBACExemption', () => {
  it('should call `usageCounter.incrementCounter`', () => {
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    trackLegacyRBACExemption('test', mockUsageCounter);
    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: `source_test`,
      counterType: 'legacyRBACExemption',
      incrementBy: 1,
    });
  });

  it('should do nothing if no usage counter is provided', () => {
    let err;
    try {
      trackLegacyRBACExemption('test', undefined);
    } catch (e) {
      err = e;
    }
    expect(err).toBeUndefined();
  });
});
