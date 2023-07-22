/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { PositiveInteger, PositiveIntegerGreaterThanZero } from '@kbn/securitysolution-io-ts-types';

// Attributes specific to Threshold rules

const thresholdField = t.exact(
  t.type({
    field: t.union([t.string, t.array(t.string)]), // Covers pre- and post-7.12
    value: PositiveIntegerGreaterThanZero,
  })
);

const thresholdFieldNormalized = t.exact(
  t.type({
    field: t.array(t.string),
    value: PositiveIntegerGreaterThanZero,
  })
);

const thresholdCardinalityField = t.exact(
  t.type({
    field: t.string,
    value: PositiveInteger,
  })
);

export type Threshold = t.TypeOf<typeof Threshold>;
export const Threshold = t.intersection([
  thresholdField,
  t.exact(
    t.partial({
      cardinality: t.array(thresholdCardinalityField),
    })
  ),
]);

export type ThresholdNormalized = t.TypeOf<typeof ThresholdNormalized>;
export const ThresholdNormalized = t.intersection([
  thresholdFieldNormalized,
  t.exact(
    t.partial({
      cardinality: t.array(thresholdCardinalityField),
    })
  ),
]);

export type ThresholdWithCardinality = t.TypeOf<typeof ThresholdWithCardinality>;
export const ThresholdWithCardinality = t.intersection([
  thresholdFieldNormalized,
  t.exact(
    t.type({
      cardinality: t.array(thresholdCardinalityField),
    })
  ),
]);
