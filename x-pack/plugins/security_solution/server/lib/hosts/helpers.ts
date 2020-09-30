/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AggregationRequest } from '../types';

export const buildFieldsTermAggregation = (esFields: readonly string[]): AggregationRequest =>
  esFields.reduce<AggregationRequest>(
    (res, field) => ({
      ...res,
      ...getTermsAggregationTypeFromField(field),
    }),
    {}
  );

const getTermsAggregationTypeFromField = (field: string): AggregationRequest => ({
  [field.replace(/\./g, '_')]: {
    terms: {
      field,
      ...(field.includes('ip') ? { missing: '\u0000\u0000\u0000\u0000' } : {}),
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
});
