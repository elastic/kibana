/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import {
  apmTransactionDurationIndicatorSchema,
  apmTransactionErrorRateIndicatorSchema,
  budgetingMethodSchema,
  dateType,
  indicatorSchema,
  indicatorTypesSchema,
  objectiveSchema,
  rollingTimeWindowSchema,
} from '../schema';

const sloSchema = t.type({
  id: t.string,
  name: t.string,
  description: t.string,
  indicator: indicatorSchema,
  time_window: rollingTimeWindowSchema,
  budgeting_method: budgetingMethodSchema,
  objective: objectiveSchema,
  revision: t.number,
  created_at: dateType,
  updated_at: dateType,
});

const apmTransactionErrorRateSLOSchema = t.intersection([
  sloSchema,
  t.type({ indicator: apmTransactionErrorRateIndicatorSchema }),
]);

const apmTransactionDurationSLOSchema = t.intersection([
  sloSchema,
  t.type({ indicator: apmTransactionDurationIndicatorSchema }),
]);

const storedSLOSchema = sloSchema;

export {
  sloSchema,
  storedSLOSchema,
  apmTransactionDurationSLOSchema,
  apmTransactionErrorRateSLOSchema,
};

type SLO = t.TypeOf<typeof sloSchema>;
type APMTransactionErrorRateSLO = t.TypeOf<typeof apmTransactionErrorRateSLOSchema>;
type APMTransactionDurationSLO = t.TypeOf<typeof apmTransactionDurationSLOSchema>;

type APMTransactionErrorRateIndicator = t.TypeOf<typeof apmTransactionErrorRateIndicatorSchema>;
type APMTransactionDurationIndicator = t.TypeOf<typeof apmTransactionDurationIndicatorSchema>;
type Indicator = t.TypeOf<typeof indicatorSchema>;
type IndicatorTypes = t.TypeOf<typeof indicatorTypesSchema>;

type StoredSLO = t.TypeOf<typeof storedSLOSchema>;

export type {
  SLO,
  APMTransactionErrorRateSLO,
  APMTransactionDurationSLO,
  Indicator,
  IndicatorTypes,
  APMTransactionErrorRateIndicator,
  APMTransactionDurationIndicator,
  StoredSLO,
};
