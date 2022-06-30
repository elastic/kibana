/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * As of 2022-04-04, this shape is still in debate. Specifically, the `source_type` will be changing as we get closer to 8.3.
 * These merely serve as placeholders for static data for now.
 */

import { HealthStatus } from '@elastic/elasticsearch/lib/api/types';

export interface SearchIndex {
  name: string;
  elasticsearch_index_name: string;
  document_count: number;
  health: HealthStatus;
  data_ingestion: 'connected' | 'incomplete';
  storage: string;
}
