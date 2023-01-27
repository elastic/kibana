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

export interface UpdateExtractionRuleArgs {
  domainId: string;
  indexName: string;
  rule: ExtractionRule;
}

export interface UpdateExtractionRuleResponse {
  extraction_rules: ExtractionRule[];
}

export const updateExtractionRule = async ({
  domainId,
  indexName,
  rule,
}: UpdateExtractionRuleArgs) => {
  const route = `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}/extraction_rules/${rule.id}`;

  const params: { extraction_rule: ExtractionRuleBase } = {
    extraction_rule: {
      description: rule.description,
      rules: rule.rules,
      url_filters: rule.url_filters,
    },
  };

  return await HttpLogic.values.http.put<UpdateExtractionRuleResponse>(route, {
    body: JSON.stringify(params),
  });
};

export const UpdateExtractionRuleApiLogic = createApiLogic(
  ['update_extraction_rule_api_logic'],
  updateExtractionRule
);

export type UpdateExtractionRuleActions = Actions<
  UpdateExtractionRuleArgs,
  UpdateExtractionRuleResponse
>;
