/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HealthStatus, FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';

export interface EnterpriseSearchEnginesResponse {
  meta: {
    from: number;
    size: number;
    total: number;
  };
  params: { q?: string; from: number; size: number };
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
}

export interface EnterpriseSearchEngineFieldCapabilities {
  created: string;
  field_capabilities: FieldCapsResponse;
  name: string;
  updated: string;
}
export interface EnterpriseSearchSchemaField {
  field_name: string;
  field_type: string[];
}
