/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { toBooleanRt } from '@kbn/io-ts-utils';

export const ML_EXPECTED_BOUNDS = 'mlBounds';
export const comparisonEnabledRt = t.union([
  t.literal(ML_EXPECTED_BOUNDS),
  toBooleanRt,
]);
export const offsetRt = t.partial({
  offset: t.string,
});
