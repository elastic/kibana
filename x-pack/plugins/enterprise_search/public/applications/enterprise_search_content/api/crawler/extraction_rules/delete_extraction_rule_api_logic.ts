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

export interface DeleteExtractionRuleArgs {
  domainId: string;
  extractionRuleId: string;
  indexName: string;
}

export interface DeleteExtractionRuleResponse {
  extraction_rules: ExtractionRule[];
}

export const deleteExtractionRule = async ({
  domainId,
  extractionRuleId,
  indexName,
}: DeleteExtractionRuleArgs) => {
  const route = `/internal/enterprise_search/indices/${indexName}/crawler/domains/${domainId}/extraction_rules/${extractionRuleId}`;

  return await HttpLogic.values.http.delete<DeleteExtractionRuleResponse>(route);
};

export const DeleteExtractionRuleApiLogic = createApiLogic(
  ['delete_extraction_rule_api_logic'],
  deleteExtractionRule
);

export type DeleteExtractionRuleActions = Actions<
  DeleteExtractionRuleArgs,
  DeleteExtractionRuleResponse
>;
