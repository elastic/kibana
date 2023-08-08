/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type EnrichPolicyType = 'match' | 'geo_match' | 'range' | '';

export interface ESEnrichPolicyType {
  name: string;
  indices: string[];
  match_field: string;
  enrich_fields: string[];
}

export interface SerializedEnrichPolicy {
  type: EnrichPolicyType;
  name: string;
  sourceIndices: string[];
  matchField: string;
  enrichFields: string[];
}

export interface ESEnrichPolicy {
  config: {
    match?: ESEnrichPolicyType;
    geo_match?: ESEnrichPolicyType;
    range?: ESEnrichPolicyType;
  };
}
