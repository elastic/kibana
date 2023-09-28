/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HealthStatus } from '@elastic/elasticsearch/lib/api/types';

export interface EnterpriseSearchApplicationsResponse {
  count: number;
  params: { from: number; q?: string; size: number };
  results: EnterpriseSearchApplication[];
}

export interface EnterpriseSearchApplication {
  indices: string[];
  name: string;
  updated_at_millis: number;
}

export interface EnterpriseSearchApplicationDetails {
  indices: EnterpriseSearchApplicationIndex[];
  name: string;
  template: {
    script: {
      lang: string;
      options: object;
      params: object;
      source: string;
    };
  };
  updated_at_millis: number;
}

export interface EnterpriseSearchApplicationIndex {
  count: number | null;
  health: HealthStatus | 'unknown';
  name: string;
}

export interface EnterpriseSearchApplicationFieldCapabilities {
  fields: SchemaField[];
  name: string;
  updated_at_millis: number;
}

export interface EnterpriseSearchApplicationUpsertResponse {
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
