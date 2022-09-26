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
  indicatorSchema,
  indicatorTypesSchema,
  commonSLOSchema,
} from '../schema';

const sloSchema = t.intersection([
  commonSLOSchema,
  t.type({
    id: t.string,
  }),
]);

const apmTransactionErrorRateSLOSchema = t.intersection([
  sloSchema,
  t.type({ indicator: apmTransactionErrorRateIndicatorSchema }),
]);

const apmTransactionDurationSLOSchema = t.intersection([
  sloSchema,
  t.type({ indicator: apmTransactionDurationIndicatorSchema }),
]);

const storedSLOSchema = t.intersection([
  sloSchema,
  t.type({ created_at: t.string, updated_at: t.string }),
]);

type SLO = t.TypeOf<typeof sloSchema>;
type APMTransactionErrorRateSLO = t.TypeOf<typeof apmTransactionErrorRateSLOSchema>;
type APMTransactionDurationSLO = t.TypeOf<typeof apmTransactionDurationSLOSchema>;

type SLI = t.TypeOf<typeof indicatorSchema>;
type SLITypes = t.TypeOf<typeof indicatorTypesSchema>;

type StoredSLO = t.TypeOf<typeof storedSLOSchema>;

export { apmTransactionDurationSLOSchema, apmTransactionErrorRateSLOSchema };
export type {
  SLO,
  APMTransactionErrorRateSLO,
  APMTransactionDurationSLO,
  SLI,
  SLITypes,
  StoredSLO,
};
