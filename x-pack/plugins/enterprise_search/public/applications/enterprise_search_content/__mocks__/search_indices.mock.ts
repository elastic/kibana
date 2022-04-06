/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SearchIndex } from '../types';

export const searchIndices = [
  {
    name: 'Our API Index',
    indexSlug: 'index-1',
    source_type: 'API',
    elasticsearch_index_name: 'ent-search-api-one',
    search_engines: 'Search Engine One, Search Engine Two',
    document_count: 100,
  },
  {
    name: 'Customer Feedback',
    indexSlug: 'index-2',
    source_type: 'Elasticsearch Index',
    elasticsearch_index_name: 'es-index-two',
    search_engines: 'Search Engine One',
    document_count: 100,
  },
  {
    name: 'Dharma Crawler',
    indexSlug: 'index-3',
    source_type: 'Crawler',
    elasticsearch_index_name: 'ent-search-crawler-one',
    search_engines: 'Search Engine One, Search Engine Two',
    document_count: 100,
  },
  {
    name: 'My Custom Source',
    indexSlug: 'index-4',
    source_type: 'Content Source',
    elasticsearch_index_name: 'ent-search-custom-source-one',
    search_engines: '--',
    document_count: 1,
  },
] as SearchIndex[];
