/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProductName } from '@kbn/product-doc-common';

export interface DocSearchOptions {
  query: string;
  max?: number;
  products?: ProductName[];
}

export interface DocSearchResult {
  title: string;
  content: string;
  url: string;
  productName: ProductName;
}

export interface DocSearchResponse {
  results: DocSearchResult[];
}

export type SearchApi = (options: DocSearchOptions) => Promise<DocSearchResponse>;
