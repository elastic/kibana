/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Loose type for the mappings
 */
export interface Mappings {
  [key: string]: unknown;
  mappings: {
    [key: string]: unknown;
    _meta: {
      index: string;
    };
  };
}

/**
 * Loose type for the transforms. id is marked optional so we can delete it before
 * pushing it through elastic client.
 * TODO: Can we use stricter pre-defined typings for the transforms here or is this ours because we define it slightly different?
 */
export interface Transforms {
  [key: string]: unknown;
  id: string;
  dest?: Partial<{
    index: string;
    pipeline: string;
  }>;
  source?: Partial<{}>;
  settings?: Partial<{
    max_page_search_size: number;
    docs_per_second: number | null;
  }>;
}
