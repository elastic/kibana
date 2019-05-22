/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AggregationRequest } from '../types';

export const buildFieldsTermAggregation = (esFields: ReadonlyArray<string>): AggregationRequest =>
  esFields.reduce<AggregationRequest>(
    (res, field) => ({
      ...res,
      ...getAggregationTypeFromField(field),
    }),
    {}
  );

const getAggregationTypeFromField = (field: string): AggregationRequest => {
  return {
    [field.replace(/\./g, '_')]: {
      terms: {
        field,
        size: 10,
        order: {
          timestamp: 'desc',
        },
      },
      aggs: {
        timestamp: {
          max: {
            field: '@timestamp',
          },
        },
      },
    },
  };
};
