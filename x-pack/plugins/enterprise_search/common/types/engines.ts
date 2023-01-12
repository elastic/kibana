/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HealthStatus } from '@elastic/elasticsearch/lib/api/types';

export interface EnterpriseSearchEnginesResponse {
  meta: {
    from: number;
    size: number;
    total: number;
  };
  results: EnterpriseSearchEngine[];
}

export interface EnterpriseSearchEngine {
  created: string;
  indices: string[];
  name: string;
  updated: string;
}

export interface EnterpriseSearchEngineDetails {
  created: string;
  indices: EnterpriseSearchEngineIndex[];
  name: string;
  updated: string;
}

export interface EnterpriseSearchEngineIndex {
  count: number;
  health: HealthStatus | 'unknown';
  name: string;
  source: 'api' | 'connector' | 'crawler';
}
