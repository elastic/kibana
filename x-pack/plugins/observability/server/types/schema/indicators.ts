/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { allOrAnyString, dateRangeSchema } from './common';

const apmTransactionDurationIndicatorTypeSchema = t.literal('sli.apm.transaction_duration');
const apmTransactionDurationIndicatorSchema = t.type({
  type: apmTransactionDurationIndicatorTypeSchema,
  params: t.intersection([
    t.type({
      environment: allOrAnyString,
      service: allOrAnyString,
      transaction_type: allOrAnyString,
      transaction_name: allOrAnyString,
      'threshold.us': t.number,
    }),
    t.partial({
      index: t.string,
    }),
  ]),
});

const apmTransactionErrorRateIndicatorTypeSchema = t.literal('sli.apm.transaction_error_rate');
const apmTransactionErrorRateIndicatorSchema = t.type({
  type: apmTransactionErrorRateIndicatorTypeSchema,
  params: t.intersection([
    t.type({
      environment: allOrAnyString,
      service: allOrAnyString,
      transaction_type: allOrAnyString,
      transaction_name: allOrAnyString,
    }),
    t.partial({
      good_status_codes: t.array(
        t.union([t.literal('2xx'), t.literal('3xx'), t.literal('4xx'), t.literal('5xx')])
      ),
      index: t.string,
    }),
  ]),
});

const kqlCustomIndicatorTypeSchema = t.literal('sli.kql.custom');
const kqlCustomIndicatorSchema = t.type({
  type: kqlCustomIndicatorTypeSchema,
  params: t.type({
    index: t.string,
    filter: t.string,
    good: t.string,
    total: t.string,
  }),
});

const indicatorDataSchema = t.type({
  date_range: dateRangeSchema,
  good: t.number,
  total: t.number,
});

const indicatorTypesSchema = t.union([
  apmTransactionDurationIndicatorTypeSchema,
  apmTransactionErrorRateIndicatorTypeSchema,
  kqlCustomIndicatorTypeSchema,
]);

const indicatorSchema = t.union([
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  kqlCustomIndicatorSchema,
]);

export {
  apmTransactionDurationIndicatorSchema,
  apmTransactionDurationIndicatorTypeSchema,
  apmTransactionErrorRateIndicatorSchema,
  apmTransactionErrorRateIndicatorTypeSchema,
  kqlCustomIndicatorSchema,
  kqlCustomIndicatorTypeSchema,
  indicatorSchema,
  indicatorTypesSchema,
  indicatorDataSchema,
};
