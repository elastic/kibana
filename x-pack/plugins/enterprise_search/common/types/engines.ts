/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HealthStatus, FieldCapsResponse } from '@elastic/elasticsearch/lib/api/types';

export interface EnterpriseSearchEnginesResponse {
  count: number;
  params: { q?: string; from: number; size: number };
  results: EnterpriseSearchEngine[];
}

export interface EnterpriseSearchEngine {
  indices: string[];
  name: string;
  updated_at_millis: number;
}

export interface EnterpriseSearchEngineDetails {
  indices: EnterpriseSearchEngineIndex[];
  updated_at_millis: number;
  name: string;
}

export interface EnterpriseSearchEngineIndex {
  count: number;
  health: HealthStatus | 'unknown';
  name: string;
}

export interface EnterpriseSearchEngineFieldCapabilities {
  field_capabilities: FieldCapsResponse;
  fields?: SchemaField[];
  name: string;
  updated_at_millis: number;
}
export interface EnterpriseSearchSchemaField {
  field_name: string;
  field_type: string[];
}

export interface EnterpriseSearchEngineUpsertResponse {
  result: string;
}
export interface SchemaFieldIndex {
  name: string;
  type: string;
}

export interface SchemaField {
  fields: SchemaField[];
  indices: SchemaFieldIndex[];
  name: string;
  type: string;
}
