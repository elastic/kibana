/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface FieldValuePair {
  fieldName: string;
  // For dynamic fieldValues we only identify fields as `string`,
  // but for example `http.response.status_code` which is part of
  // of the list of predefined field candidates is of type long/number.
  fieldValue: string | number;
}

export interface HistogramItem {
  key: number;
  doc_count: number;
}

export interface ResponseHitSource {
  [s: string]: unknown;
}

export interface ResponseHit {
  _source: ResponseHitSource;
}

export interface RawResponseBase {
  ccsWarning: boolean;
  took: number;
}

export interface SearchStrategyClientParamsBase {
  environment: string;
  kuery: string;
  serviceName?: string;
  transactionName?: string;
  transactionType?: string;
}

export interface RawSearchStrategyClientParams
  extends SearchStrategyClientParamsBase {
  start?: string;
  end?: string;
}

export interface SearchStrategyClientParams
  extends SearchStrategyClientParamsBase {
  start: number;
  end: number;
}

export interface SearchStrategyServerParams {
  index: string;
  includeFrozen?: boolean;
}

export type SearchStrategyParams = SearchStrategyClientParams &
  SearchStrategyServerParams;
