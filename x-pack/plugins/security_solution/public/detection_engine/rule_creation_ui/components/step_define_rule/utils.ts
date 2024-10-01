/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Type } from '@kbn/securitysolution-io-ts-alerting-types';
import type { FieldSpec } from '@kbn/data-plugin/common';

import { CUSTOM_QUERY_REQUIRED, EQL_QUERY_REQUIRED, ESQL_QUERY_REQUIRED } from './translations';

import { isEqlRule, isEsqlRule } from '../../../../../common/detection_engine/utils';

/**
 * Filters out fields, that are not supported in terms aggregation.
 * Terms aggregation supports limited number of types:
 * Keyword, Numeric, ip, boolean, or binary.
 * https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-terms-aggregation.html
 */
export const getTermsAggregationFields = (fields: FieldSpec[]): FieldSpec[] => {
  // binary types is excluded, as binary field has property aggregatable === false
  const allowedTypesSet = new Set(['string', 'number', 'ip', 'boolean']);

  return fields.filter((field) => field.aggregatable === true && allowedTypesSet.has(field.type));
};

/**
 * return query is required message depends on a rule type
 */
export const getQueryRequiredMessage = (ruleType: Type) => {
  if (isEsqlRule(ruleType)) {
    return ESQL_QUERY_REQUIRED;
  }

  if (isEqlRule(ruleType)) {
    return EQL_QUERY_REQUIRED;
  }

  return CUSTOM_QUERY_REQUIRED;
};
