/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RuleFormValidationError } from '@kbn/alerts-ui-shared';
import { COMPARATORS } from '@kbn/triggers-actions-ui-plugin/public';

export const DEFAULT_VALUES = {
  THRESHOLD_COMPARATOR: COMPARATORS.GREATER_THAN,
  QUERY: `{
    "query":{
      "match_all" : {}
    }
  }`,
  SIZE: 100,
  TIME_WINDOW_SIZE: 5,
  TIME_WINDOW_UNIT: 'm',
  THRESHOLD: [1000],
  AGGREGATION_TYPE: 'count',
  TERM_SIZE: 5,
  GROUP_BY: 'all',
  EXCLUDE_PREVIOUS_HITS: false,
  CAN_SELECT_MULTI_TERMS: true,
  SOURCE_FIELDS: [],
};

export const COMMON_EXPRESSION_ERRORS = {
  searchType: new Array<RuleFormValidationError>(),
  threshold0: new Array<RuleFormValidationError>(),
  threshold1: new Array<RuleFormValidationError>(),
  timeWindowSize: new Array<RuleFormValidationError>(),
  size: new Array<RuleFormValidationError>(),
  aggField: new Array<RuleFormValidationError>(),
  aggType: new Array<RuleFormValidationError>(),
  groupBy: new Array<RuleFormValidationError>(),
  termSize: new Array<RuleFormValidationError>(),
  termField: new Array<RuleFormValidationError>(),
  sourceFields: new Array<RuleFormValidationError>(),
};

export const SEARCH_SOURCE_ONLY_EXPRESSION_ERRORS = {
  searchConfiguration: new Array<RuleFormValidationError>(),
  timeField: new Array<RuleFormValidationError>(),
};

export const ONLY_ES_QUERY_EXPRESSION_ERRORS = {
  index: new Array<RuleFormValidationError>(),
  esQuery: new Array<RuleFormValidationError>(),
  timeField: new Array<RuleFormValidationError>(),
};

export const ONLY_ESQL_QUERY_EXPRESSION_ERRORS = {
  esqlQuery: new Array<RuleFormValidationError>(),
  timeField: new Array<RuleFormValidationError>(),
  thresholdComparator: new Array<RuleFormValidationError>(),
  threshold0: new Array<RuleFormValidationError>(),
};

const ALL_EXPRESSION_ERROR_ENTRIES = {
  ...COMMON_EXPRESSION_ERRORS,
  ...SEARCH_SOURCE_ONLY_EXPRESSION_ERRORS,
  ...ONLY_ES_QUERY_EXPRESSION_ERRORS,
};

export const ALL_EXPRESSION_ERROR_KEYS = Object.keys(ALL_EXPRESSION_ERROR_ENTRIES) as Array<
  keyof typeof ALL_EXPRESSION_ERROR_ENTRIES
>;
