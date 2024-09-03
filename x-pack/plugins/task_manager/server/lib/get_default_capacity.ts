/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CLAIM_STRATEGY_MGET, DEFAULT_CAPACITY } from '../config';

interface GetDefaultCapacityOpts {
  claimStrategy?: string;
  heapSizeLimit: number;
  isCloud: boolean;
  isServerless: boolean;
  isBackgroundTaskNodeOnly: boolean;
}

// Map instance size to desired capacity
const HEAP_TO_CAPACITY_MAP = [
  { minHeap: 0, maxHeap: 1, capacity: 10 },
  { minHeap: 1, maxHeap: 2, capacity: 15 },
  { minHeap: 2, maxHeap: 4, capacity: 25, backgroundTaskNodeOnly: false },
  { minHeap: 2, maxHeap: 4, capacity: 50, backgroundTaskNodeOnly: true },
];

export function getDefaultCapacity({
  claimStrategy,
  heapSizeLimit: heapSizeLimitInBytes,
  isCloud,
  isServerless,
  isBackgroundTaskNodeOnly,
}: GetDefaultCapacityOpts) {
  // perform heap size based calculations only in cloud
  if (isCloud && !isServerless && claimStrategy === CLAIM_STRATEGY_MGET) {
    // convert bytes to GB
    const heapSizeLimitInGB = heapSizeLimitInBytes / 1e9;

    const config = HEAP_TO_CAPACITY_MAP.find((map) => {
      return (
        heapSizeLimitInGB > map.minHeap &&
        heapSizeLimitInGB <= map.maxHeap &&
        (map.backgroundTaskNodeOnly === undefined ||
          isBackgroundTaskNodeOnly === map.backgroundTaskNodeOnly)
      );
    });

    return config?.capacity ?? DEFAULT_CAPACITY;
  }

  return DEFAULT_CAPACITY;
}
