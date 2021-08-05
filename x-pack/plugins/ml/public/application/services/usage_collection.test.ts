/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCollectionSetup } from 'src/plugins/usage_collection/public';

import { mlUsageCollectionProvider } from './usage_collection';

describe('usage_collection', () => {
  let usageCollection: UsageCollectionSetup | null = null;

  beforeEach(() => {
    usageCollection = ({
      reportUiCounter: jest.fn(),
    } as unknown) as UsageCollectionSetup;
  });

  test('mlUsageCollection', () => {
    const mlUsageCollection = mlUsageCollectionProvider(
      (usageCollection as unknown) as UsageCollectionSetup
    );

    mlUsageCollection.click('test');
    mlUsageCollection.count('test');
    // @ts-expect-error reportUiCounter is a mock function
    expect(usageCollection.reportUiCounter.mock.calls).toHaveLength(2);
  });

  test('mlUsageCollection1', () => {
    const mlUsageCollection = mlUsageCollectionProvider(undefined);
    mlUsageCollection.click('test', 1);
    mlUsageCollection.count('test', 2);
    // @ts-expect-error reportUiCounter is a mock function
    expect(usageCollection.reportUiCounter.mock.calls).toHaveLength(0);
  });
});
