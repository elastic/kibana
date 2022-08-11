/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from '@kbn/usage-collection-plugin/public';

import { mlUsageCollectionProvider } from './usage_collection';

describe('usage_collection', () => {
  let usageCollection: jest.Mocked<UsageCollectionSetup>;

  beforeEach(() => {
    usageCollection = {
      reportUiCounter: jest.fn(),
    } as unknown as jest.Mocked<UsageCollectionSetup>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should use usageCollection for usage events', () => {
    const mlUsageCollection = mlUsageCollectionProvider(usageCollection);

    mlUsageCollection.click('exported_anomaly_detector_jobs');
    mlUsageCollection.count('exported_data_frame_analytics_jobs');
    expect(usageCollection.reportUiCounter).toHaveBeenCalledTimes(2);
    expect(usageCollection.reportUiCounter).toHaveBeenCalledWith(
      'ml',
      'click',
      'exported_anomaly_detector_jobs',
      undefined
    );
    expect(usageCollection.reportUiCounter).toHaveBeenCalledWith(
      'ml',
      'count',
      'exported_data_frame_analytics_jobs',
      undefined
    );
  });

  test('should not use usageCollection if usageCollection is disabled', () => {
    const mlUsageCollection = mlUsageCollectionProvider(undefined);
    mlUsageCollection.click('imported_anomaly_detector_jobs', 1);
    mlUsageCollection.count('imported_data_frame_analytics_jobs', 2);
    expect(usageCollection.reportUiCounter).toHaveBeenCalledTimes(0);

    expect(usageCollection.reportUiCounter).not.toHaveBeenCalledWith(
      'ml',
      'click',
      'imported_anomaly_detector_jobs',
      undefined
    );
    expect(usageCollection.reportUiCounter).not.toHaveBeenCalledWith(
      'ml',
      'count',
      'imported_data_frame_analytics_jobs',
      undefined
    );
  });
});
