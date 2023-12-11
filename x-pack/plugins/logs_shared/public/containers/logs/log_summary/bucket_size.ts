/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';

const SUMMARY_BUCKET_COUNT = 100;

export function useBucketSize(
  startTimestamp: number | null,
  endTimestamp: number | null
): number | null {
  const bucketSize = useMemo(() => {
    if (!startTimestamp || !endTimestamp) {
      return null;
    }
    return (endTimestamp - startTimestamp) / SUMMARY_BUCKET_COUNT;
  }, [startTimestamp, endTimestamp]);

  return bucketSize;
}
