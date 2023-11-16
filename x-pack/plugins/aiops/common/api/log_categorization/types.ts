/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { estypes } from '@elastic/elasticsearch';

export interface Category {
  key: string;
  count: number;
  examples: string[];
  sparkline?: Array<{ doc_count: number; key: number; key_as_string: string }>;
}

export interface CategoriesAgg {
  categories: {
    buckets: Array<{
      key: string;
      doc_count: number;
      hit: { hits: { hits: Array<{ _source: { message: string } }> } };
      sparkline: {
        buckets: Array<{ key_as_string: string; key: number; doc_count: number }>;
      };
    }>;
  };
}

interface CategoriesSampleAgg {
  sample: CategoriesAgg;
}

export interface CatResponse {
  rawResponse: estypes.SearchResponseBody<unknown, CategoriesAgg | CategoriesSampleAgg>;
}

export type SparkLinesPerCategory = Record<string, Record<number, number>>;
