/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';

export const scoringRt = t.union([
  t.literal('jlh'),
  t.literal('chi_square'),
  t.literal('gnd'),
  t.literal('percentage'),
]);

export type SignificantTermsScoring = t.TypeOf<typeof scoringRt>;
