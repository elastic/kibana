/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type EnrichPolicyType = 'match' | 'geo_match' | 'range' | '';

export interface BaseTypes {
  name: string;
  indices: string[];
  match_field: string;
  enrich_fields: string[];
}

export interface EnrichPolicy extends BaseTypes {
  type: EnrichPolicyType;
}

export interface BaseEnrichPolicy {
  config: {
    match?: BaseTypes;
    geo_match?: BaseTypes;
    range?: BaseTypes;
  };
}
