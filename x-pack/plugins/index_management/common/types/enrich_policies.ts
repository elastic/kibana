/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EnrichPolicyType } from '@elastic/elasticsearch/lib/api/types';

export interface SerializedEnrichPolicy {
  type: EnrichPolicyType;
  name: string;
  sourceIndices: string[];
  matchField: string;
  enrichFields: string[];
  query?: Record<string, any>;
}

export interface FieldItem {
  name: string;
  type: string;
  normalizedType: string;
}

export interface IndexWithFields {
  index: string;
  fields: FieldItem[];
}

export interface FieldFromIndicesRequest {
  commonFields: FieldItem[];
  indices: IndexWithFields[];
}
