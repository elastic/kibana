/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DslQuery, Filter } from 'src/plugins/data/common';

import { JsonObject } from '../../../../src/plugins/kibana_utils/common';

export type ESQuery =
  | ESRangeQuery
  | ESQueryStringQuery
  | ESMatchQuery
  | ESTermQuery
  | ESBoolQuery
  | JsonObject;

export interface ESRangeQuery {
  range: {
    [name: string]: {
      gte: number;
      lte: number;
      format: string;
    };
  };
}

export interface ESMatchQuery {
  match: {
    [name: string]: {
      query: string;
      operator: string;
      zero_terms_query: string;
    };
  };
}

export interface ESQueryStringQuery {
  query_string: {
    query: string;
    analyze_wildcard: boolean;
  };
}

export interface ESTermQuery {
  term: Record<string, string>;
}

export interface ESBoolQuery {
  bool: {
    must: DslQuery[];
    filter: Filter[];
    should: never[];
    must_not: Filter[];
  };
}
