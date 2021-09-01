/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface RawResponseBase {
  ccsWarning: boolean;
  took: number;
}

export interface SearchStrategyClientParams {
  environment: string;
  kuery: string;
  serviceName?: string;
  transactionName?: string;
  transactionType?: string;
  start?: string;
  end?: string;
}

export interface SearchStrategyServerParams {
  index: string;
  includeFrozen?: boolean;
}

export type SearchStrategyParams = SearchStrategyClientParams &
  SearchStrategyServerParams;
