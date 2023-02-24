/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import type { AggregationsAggregationContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

const INVALID_RULE_AGG_TERMS = [
  'kibana.alert.rule.consumer',
  'kibana.alert.rule.producer',
  'alert.attributes.consumer',
  'alert.attributes.apiKey',
];

export const validateRuleAggregationFields = (
  aggs: Record<string, AggregationsAggregationContainer>
) => {
  Object.values(aggs).forEach((aggContainer) => {
    // validate root level aggregation fields (non aggs/aggregations)
    validateRootLevelRuleAggregationFields(aggContainer);

    // Recursively go through aggs to validate terms
    if (aggContainer.aggs) {
      validateRuleAggregationFields(aggContainer.aggs);
    }
    if (aggContainer.aggregations) {
      validateRuleAggregationFields(aggContainer.aggregations);
    }

    // Found terms, check terms field against blocklist
    if (aggContainer.terms?.field && INVALID_RULE_AGG_TERMS.includes(aggContainer.terms.field)) {
      throw Boom.badRequest(`Invalid aggregation term: ${aggContainer.terms.field}`);
    }
  });
};

const validateRootLevelRuleAggregationFields = (container: AggregationsAggregationContainer) => {
  Object.entries(container).forEach(([aggName, aggContainer]) => {
    // Found field, check field against blocklist
    if (aggName === 'field' && INVALID_RULE_AGG_TERMS.includes(aggContainer)) {
      throw Boom.badRequest(`Invalid aggregation term: ${aggContainer}`);
    }

    // Do not try to validate aggs/aggregations, as the above function is already doing that
    if (aggContainer.aggs || aggContainer.aggregations) {
      return;
    }

    // Need to check array for multi_term aggregations
    if (Array.isArray(aggContainer)) {
      return aggContainer.forEach((innerAggContainer) => {
        if (typeof innerAggContainer === 'object' && innerAggContainer !== null) {
          return validateRootLevelRuleAggregationFields(innerAggContainer);
        }
      });
    }

    // Did not find anything, keep recursing
    if (typeof aggContainer === 'object' && aggContainer !== null) {
      return validateRootLevelRuleAggregationFields(aggContainer);
    }
  });
};
