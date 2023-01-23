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
  historicalSummarySchema,
  indicatorDataSchema,
  indicatorSchema,
  indicatorTypesSchema,
  kqlCustomIndicatorSchema,
} from '@kbn/slo-schema';

type APMTransactionErrorRateIndicator = t.TypeOf<typeof apmTransactionErrorRateIndicatorSchema>;
type APMTransactionDurationIndicator = t.TypeOf<typeof apmTransactionDurationIndicatorSchema>;
type KQLCustomIndicator = t.TypeOf<typeof kqlCustomIndicatorSchema>;
type Indicator = t.TypeOf<typeof indicatorSchema>;
type IndicatorTypes = t.TypeOf<typeof indicatorTypesSchema>;
type IndicatorData = t.TypeOf<typeof indicatorDataSchema>;
type HistoricalSummary = t.TypeOf<typeof historicalSummarySchema>;

export type {
  Indicator,
  IndicatorTypes,
  APMTransactionErrorRateIndicator,
  APMTransactionDurationIndicator,
  KQLCustomIndicator,
  IndicatorData,
  HistoricalSummary,
};
