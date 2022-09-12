/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

export const ALL_VALUE = 'ALL';
const allOrAnyString = t.union([t.literal(ALL_VALUE), t.string]);

const apmTransactionDurationIndicatorTypeSchema = t.literal('slo.apm.transaction_duration');
export const apmTransactionDurationIndicatorSchema = t.type({
  type: apmTransactionDurationIndicatorTypeSchema,
  params: t.type({
    environment: allOrAnyString,
    service: allOrAnyString,
    transaction_type: allOrAnyString,
    transaction_name: allOrAnyString,
    'threshold.us': t.number,
  }),
});

const apmTransactionErrorRateIndicatorTypeSchema = t.literal('slo.apm.transaction_error_rate');
export const apmTransactionErrorRateIndicatorSchema = t.type({
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
    }),
  ]),
});

export const rollingTimeWindowSchema = t.type({
  duration: t.string,
  is_rolling: t.literal(true),
});

export const indicatorTypesSchema = t.union([
  apmTransactionDurationIndicatorTypeSchema,
  apmTransactionErrorRateIndicatorTypeSchema,
]);

export const indicatorSchema = t.union([
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
]);

const sloOptionalSettingsSchema = t.partial({
  settings: t.partial({
    destination_index: t.string,
  }),
});

const createSLOBodySchema = t.intersection([
  t.type({
    name: t.string,
    description: t.string,
    indicator: indicatorSchema,
    time_window: rollingTimeWindowSchema,
    budgeting_method: t.literal('occurrences'),
    objective: t.type({
      target: t.number,
    }),
  }),
  sloOptionalSettingsSchema,
]);

export const createSLOParamsSchema = t.type({
  body: createSLOBodySchema,
});
