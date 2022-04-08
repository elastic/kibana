/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * As of 2022-04-04, this shapre is still in debate. Specifically, the `source_type` will be changing as we get closer to 8.3.
 * These merely serve as placeholders for static data for now.
 */
export interface SearchIndex {
  name: string;
  indexSlug: string;
  source_type: string;
  elasticsearch_index_name: string;
  search_engines: string;
  document_count: number;
}
