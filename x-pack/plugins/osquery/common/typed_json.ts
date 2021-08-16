/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BoolQuery } from '@kbn/es-query';
import { JsonObject } from '@kbn/utility-types';

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
  bool: BoolQuery;
}
