/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { usageCountersServiceMock } from '@kbn/usage-collection-plugin/server/usage_counters/usage_counters_service.mock';
import { countUsageOfPredefinedIds } from './count_usage_of_predefined_ids';

beforeEach(() => {
  jest.resetAllMocks();
});

describe('countUsageOfPredefinedIds', () => {
  it('does not call usage counter when predefined ID is undefined', () => {
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    countUsageOfPredefinedIds({ usageCounter: mockUsageCounter });

    expect(mockUsageCounter.incrementCounter).not.toHaveBeenCalled();
  });

  it('correctly calls usage counter when predefined ID is specified and space ID is undefined', () => {
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    countUsageOfPredefinedIds({ predefinedId: 'my-id', usageCounter: mockUsageCounter });

    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(1);
    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'ruleCreatedWithPredefinedId',
      incrementBy: 1,
    });
  });

  it('correctly calls usage counter when predefined ID is specified and space ID is default', () => {
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    countUsageOfPredefinedIds({
      predefinedId: 'my-id',
      spaceId: 'default',
      usageCounter: mockUsageCounter,
    });

    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(1);
    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'ruleCreatedWithPredefinedId',
      incrementBy: 1,
    });
  });

  it('correctly calls usage counter when predefined ID is specified and space ID is not default', () => {
    const mockUsageCountersSetup = usageCountersServiceMock.createSetupContract();
    const mockUsageCounter = mockUsageCountersSetup.createUsageCounter('test');

    countUsageOfPredefinedIds({
      predefinedId: 'my-id',
      spaceId: 'yo',
      usageCounter: mockUsageCounter,
    });

    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledTimes(2);
    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'ruleCreatedWithPredefinedId',
      incrementBy: 1,
    });
    expect(mockUsageCounter.incrementCounter).toHaveBeenCalledWith({
      counterName: 'ruleCreatedWithPredefinedIdInCustomSpace',
      incrementBy: 1,
    });
  });
});
