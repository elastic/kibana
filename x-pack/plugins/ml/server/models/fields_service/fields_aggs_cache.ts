/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { pick } from 'lodash';

/**
 * Cached aggregation types
 */
type AggType = 'overallCardinality' | 'maxBucketCardinality';

type CacheStorage = { [key in AggType]: { [field: string]: number } };

/**
 * Caches cardinality fields values to avoid
 * unnecessary aggregations on elasticsearch
 */
export const initCardinalityFieldsCache = () => {
  const cardinalityCache = new Map<string, CacheStorage>();

  return {
    /**
     * Gets requested values from cache
     */
    getValues(
      indexPatternName: string | string[],
      timeField: string,
      earliestMs: number,
      latestMs: number,
      aggType: AggType,
      fieldNames: string[]
    ): CacheStorage[AggType] | null {
      const cacheKey = indexPatternName + timeField + earliestMs + latestMs;
      const cached = cardinalityCache.get(cacheKey);
      if (!cached) {
        return null;
      }
      return pick(cached[aggType], fieldNames);
    },
    /**
     * Extends cache with provided values
     */
    updateValues(
      indexPatternName: string | string[],
      timeField: string,
      earliestMs: number,
      latestMs: number,
      update: Partial<CacheStorage>
    ): void {
      const cacheKey = indexPatternName + timeField + earliestMs + latestMs;
      const cachedValues = cardinalityCache.get(cacheKey);
      if (cachedValues === undefined) {
        cardinalityCache.set(cacheKey, {
          overallCardinality: update.overallCardinality ?? {},
          maxBucketCardinality: update.maxBucketCardinality ?? {},
        });
        return;
      }

      Object.assign(cachedValues.overallCardinality, update.overallCardinality);
      Object.assign(cachedValues.maxBucketCardinality, update.maxBucketCardinality);
    },
  };
};
