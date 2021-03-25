/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Aggregation, AggregationValue } from '../../../common/search_strategy/osquery';

interface AggregationResult {
  [key: string]: {
    terms: {
      field: string;
    };
    aggs?: AggregationResult;
  };
}

function isPrimitive(a: AggregationValue): a is string {
  return typeof a === 'string';
}

export function parseAggregator(aggs: Aggregation) {
  return Object.keys(aggs).reduce((acc, aggKey) => {
    const value = aggs[aggKey];
    if (isPrimitive(value)) {
      acc[aggKey] = {
        terms: {
          field: aggs[aggKey] as string,
        },
      };
    } else {
      acc[aggKey] = {
        terms: {
          field: value.field,
        },
        aggs: parseAggregator(value.subaggs),
      };
    }
    return acc;
  }, {} as AggregationResult);
}
