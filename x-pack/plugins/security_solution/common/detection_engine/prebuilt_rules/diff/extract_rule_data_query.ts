/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  EqlQueryLanguage,
  EsqlQueryLanguage,
  EventCategoryOverride,
  KqlQueryLanguage,
  RuleFilterArray,
  RuleQuery,
  TiebreakerField,
  TimestampField,
} from '../../../api/detection_engine/model/rule_schema';
import type {
  InlineKqlQuery,
  RuleEqlQuery,
  RuleEsqlQuery,
  RuleKqlQuery,
} from '../../../api/detection_engine/prebuilt_rules';
import { KqlQueryType } from '../../../api/detection_engine/prebuilt_rules';

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

interface ExtractRuleEqlQueryParams {
  query: RuleQuery;
  language: EqlQueryLanguage;
  filters: RuleFilterArray | undefined;
  eventCategoryOverride: EventCategoryOverride | undefined;
  timestampField: TimestampField | undefined;
  tiebreakerField: TiebreakerField | undefined;
}

export const extractRuleEqlQuery = (params: ExtractRuleEqlQueryParams): RuleEqlQuery => {
  return {
    query: params.query,
    language: params.language,
    filters: params.filters ?? [],
    event_category_override: params.eventCategoryOverride,
    timestamp_field: params.timestampField,
    tiebreaker_field: params.tiebreakerField,
  };
};

export const extractRuleEsqlQuery = (
  query: RuleQuery,
  language: EsqlQueryLanguage
): RuleEsqlQuery => {
  return {
    query,
    language,
  };
};
