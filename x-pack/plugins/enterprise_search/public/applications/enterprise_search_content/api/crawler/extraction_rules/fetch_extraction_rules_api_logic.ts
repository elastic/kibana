/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExtractionRule } from '../../../../../../common/types/extraction_rules';
import { Actions } from '../../../../shared/api_logic/create_api_logic';

import { createApiLogic } from '../../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../../shared/http';

export interface FetchExtractionRulesArgs {
  domainId: string;
  indexName: string;
}

export interface FetchExtractionRulesResponse {
  extraction_rules: ExtractionRule[]; // the name of the newly created index
}

export const fetchExtractionRules = async ({ domainId, indexName }: FetchExtractionRulesArgs) => {
  const route = `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}/extraction_rules`;

  return await HttpLogic.values.http.get<FetchExtractionRulesResponse>(route);
};

export const FetchExtractionRulesApiLogic = createApiLogic(
  ['fetch_extraction_rule_api_logic'],
  fetchExtractionRules
);

export type FetchExtractionRulesActions = Actions<
  FetchExtractionRulesArgs,
  FetchExtractionRulesResponse
>;
