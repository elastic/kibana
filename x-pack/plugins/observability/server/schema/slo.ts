/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

const allOrAnyString = t.union([t.literal('ALL'), t.string]);

const apmTransactionDurationIndicatorSchema = t.type({
  type: t.literal('slo.apm.transaction_duration'),
  params: t.type({
    environment: allOrAnyString,
    service: allOrAnyString,
    transaction_type: allOrAnyString,
    transaction_name: allOrAnyString,
    'threshold.us': t.number,
  }),
});

const apmTransactionErrorRateIndicatorSchema = t.type({
  type: t.literal('slo.apm.transaction_error_rate'),
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

const rollingTimeWindowSchema = t.type({
  duration: t.string,
  is_rolling: t.literal(true),
});

export const createSloParamsSchema = t.type({
  body: t.type({
    name: t.string,
    description: t.string,
    indicator: t.union([
      apmTransactionDurationIndicatorSchema,
      apmTransactionErrorRateIndicatorSchema,
    ]),
    time_window: rollingTimeWindowSchema,
    budgeting_method: t.literal('occurrences'),
    objective: t.type({
      target: t.number,
    }),
  }),
});
