/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExtractionRule,
  ExtractionRuleBase,
} from '../../../../../../common/types/extraction_rules';
import { Actions } from '../../../../shared/api_logic/create_api_logic';

import { createApiLogic } from '../../../../shared/api_logic/create_api_logic';
import { HttpLogic } from '../../../../shared/http';

export interface AddExtractionRuleArgs {
  domainId: string;
  indexName: string;
  rule: ExtractionRuleBase;
}

export interface AddExtractionRuleResponse {
  extraction_rules: ExtractionRule[]; // the name of the newly created index
}

export const addExtractionRule = async ({ domainId, indexName, rule }: AddExtractionRuleArgs) => {
  const route = `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}/extraction_rules`;

  const params = { extraction_rule: rule };

  return await HttpLogic.values.http.post<AddExtractionRuleResponse>(route, {
    body: JSON.stringify(params),
  });
};

export const AddExtractionRuleApiLogic = createApiLogic(
  ['add_extraction_rule_api_logic'],
  addExtractionRule
);

export type AddExtractionRuleActions = Actions<AddExtractionRuleArgs, AddExtractionRuleResponse>;
