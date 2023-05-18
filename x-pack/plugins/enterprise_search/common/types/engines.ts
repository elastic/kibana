/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HealthStatus } from '@elastic/elasticsearch/lib/api/types';

export interface EnterpriseSearchEnginesResponse {
  count: number;
  params: { from: number; q?: string; size: number };
  results: EnterpriseSearchEngine[];
}

export interface EnterpriseSearchEngine {
  indices: string[];
  name: string;
  updated_at_millis: number;
}

export interface EnterpriseSearchEngineDetails {
  indices: EnterpriseSearchEngineIndex[];
  name: string;
  updated_at_millis: number;
}

export interface EnterpriseSearchEngineIndex {
  count: number | null;
  health: HealthStatus | 'unknown';
  name: string;
}

export interface EnterpriseSearchEngineFieldCapabilities {
  fields: SchemaField[];
  name: string;
  updated_at_millis: number;
}

export interface EnterpriseSearchEngineUpsertResponse {
  result: string;
}
export interface SchemaFieldIndex {
  name: string;
  type: string;
}

export interface SchemaField {
  aggregatable: boolean;
  indices: SchemaFieldIndex[];
  metadata_field?: boolean;
  name: string;
  searchable: boolean;
  type: string;
}
