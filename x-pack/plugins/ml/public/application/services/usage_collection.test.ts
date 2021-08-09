/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from 'src/plugins/usage_collection/public';

import { mlUsageCollectionProvider } from './usage_collection';

describe('usage_collection', () => {
  let usageCollection: jest.Mocked<UsageCollectionSetup>;

  beforeEach(() => {
    usageCollection = ({
      reportUiCounter: jest.fn(),
    } as unknown) as jest.Mocked<UsageCollectionSetup>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('mlUsageCollection', () => {
    const mlUsageCollection = mlUsageCollectionProvider(usageCollection);

    mlUsageCollection.click('test');
    mlUsageCollection.count('test');
    expect(usageCollection.reportUiCounter).toHaveBeenCalledTimes(2);
  });

  test('mlUsageCollection1', () => {
    const mlUsageCollection = mlUsageCollectionProvider(undefined);
    mlUsageCollection.click('test', 1);
    mlUsageCollection.count('test', 2);
    expect(usageCollection.reportUiCounter).toHaveBeenCalledTimes(0);
  });
});
