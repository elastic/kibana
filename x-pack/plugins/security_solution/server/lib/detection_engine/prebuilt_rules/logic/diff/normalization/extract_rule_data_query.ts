/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EqlQueryLanguage,
  KqlQueryLanguage,
  RuleFilterArray,
  RuleQuery,
} from '../../../../../../../common/detection_engine/rule_schema';
import type {
  InlineKqlQuery,
  RuleEqlQuery,
  RuleKqlQuery,
} from '../../../../../../../common/detection_engine/prebuilt_rules/model/diff/diffable_rule/diffable_field_types';
import { KqlQueryType } from '../../../../../../../common/detection_engine/prebuilt_rules/model/diff/diffable_rule/diffable_field_types';

export const extractRuleKqlQuery = (
  query: RuleQuery | undefined,
  language: KqlQueryLanguage | undefined,
  filters: RuleFilterArray | undefined,
  savedQueryId: string | undefined
): RuleKqlQuery => {
  if (savedQueryId != null) {
    return {
      type: KqlQueryType.saved_query,
      saved_query_id: savedQueryId,
    };
  } else {
    return extractInlineKqlQuery(query, language, filters);
  }
};

export const extractInlineKqlQuery = (
  query: RuleQuery | undefined,
  language: KqlQueryLanguage | undefined,
  filters: RuleFilterArray | undefined
): InlineKqlQuery => {
  return {
    type: KqlQueryType.inline_query,
    query: query ?? '',
    language: language ?? 'kuery',
    filters: filters ?? [],
  };
};

export const extractRuleEqlQuery = (
  query: RuleQuery,
  language: EqlQueryLanguage,
  filters: RuleFilterArray | undefined
): RuleEqlQuery => {
  return {
    query,
    language,
    filters: filters ?? [],
  };
};
