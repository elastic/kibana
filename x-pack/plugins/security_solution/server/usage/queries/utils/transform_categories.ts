/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Top10Failure } from '../../detections/rules/types';
import type { Categories } from '../../types';
import { transformCategoryBucket } from './transform_category_bucket';

/**
 * Given a set of categories from a categorization aggregation this will
 * return those transformed.
 * @param categories The categories to transform
 * @see https://www.elastic.co/guide/en/elasticsearch/reference/8.1/search-aggregations-bucket-categorize-text-aggregation.html
 * @returns the categories transformed
 */
export const transformCategories = (categories: Categories): Top10Failure => {
  return {
    '1': transformCategoryBucket(categories.buckets[0]),
    '2': transformCategoryBucket(categories.buckets[1]),
    '3': transformCategoryBucket(categories.buckets[2]),
    '4': transformCategoryBucket(categories.buckets[3]),
    '5': transformCategoryBucket(categories.buckets[4]),
    '6': transformCategoryBucket(categories.buckets[5]),
    '7': transformCategoryBucket(categories.buckets[6]),
    '8': transformCategoryBucket(categories.buckets[7]),
    '9': transformCategoryBucket(categories.buckets[8]),
    '10': transformCategoryBucket(categories.buckets[9]),
  };
};
