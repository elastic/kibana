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
    elasticsearch_index_name: 'ent-search-api-one',
    document_count: 100,
    health: 'green',
    data_ingestion: 'connected',
    storage: '9.3mb',
  },
  {
    name: 'Customer Feedback',
    elasticsearch_index_name: 'es-index-two',
    document_count: 100,
    health: 'green',
    data_ingestion: 'connected',
    storage: '9.3mb',
  },
  {
    name: 'Dharma Crawler',
    elasticsearch_index_name: 'ent-search-crawler-one',
    document_count: 100,
    health: 'yellow',
    data_ingestion: 'incomplete',
    storage: '9.3mb',
  },
  {
    name: 'My Custom Source',
    elasticsearch_index_name: 'ent-search-custom-source-one',
    document_count: 1,
    health: 'red',
    data_ingestion: 'incomplete',
    storage: '0mb',
  },
] as SearchIndex[];
