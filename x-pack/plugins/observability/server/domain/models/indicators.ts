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
  indicatorTypesSchema,
} from '../../types/schema';

type APMTransactionDurationIndicator = t.TypeOf<typeof apmTransactionDurationIndicatorSchema>;
type APMTransactionErrorRateIndicator = t.TypeOf<typeof apmTransactionErrorRateIndicatorSchema>;

type Indicator = APMTransactionDurationIndicator | APMTransactionErrorRateIndicator;
type IndicatorTypes = t.TypeOf<typeof indicatorTypesSchema>;

export {
  APMTransactionDurationIndicator,
  APMTransactionErrorRateIndicator,
  Indicator,
  IndicatorTypes,
};
