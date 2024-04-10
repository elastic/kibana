/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  searchType: new Array<string>(),
  threshold0: new Array<string>(),
  threshold1: new Array<string>(),
  timeWindowSize: new Array<string>(),
  size: new Array<string>(),
  aggField: new Array<string>(),
  aggType: new Array<string>(),
  groupBy: new Array<string>(),
  termSize: new Array<string>(),
  termField: new Array<string>(),
  sourceFields: new Array<string>(),
};

export const SEARCH_SOURCE_ONLY_EXPRESSION_ERRORS = {
  searchConfiguration: new Array<string>(),
  timeField: new Array<string>(),
};

export const ONLY_ES_QUERY_EXPRESSION_ERRORS = {
  index: new Array<string>(),
  esQuery: new Array<string>(),
  timeField: new Array<string>(),
};

export const ONLY_ESQL_QUERY_EXPRESSION_ERRORS = {
  esqlQuery: new Array<string>(),
  timeField: new Array<string>(),
  thresholdComparator: new Array<string>(),
  threshold0: new Array<string>(),
};

const ALL_EXPRESSION_ERROR_ENTRIES = {
  ...COMMON_EXPRESSION_ERRORS,
  ...SEARCH_SOURCE_ONLY_EXPRESSION_ERRORS,
  ...ONLY_ES_QUERY_EXPRESSION_ERRORS,
};

export const ALL_EXPRESSION_ERROR_KEYS = Object.keys(ALL_EXPRESSION_ERROR_ENTRIES) as Array<
  keyof typeof ALL_EXPRESSION_ERROR_ENTRIES
>;
