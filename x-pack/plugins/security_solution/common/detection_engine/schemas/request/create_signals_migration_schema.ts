/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';

import { index } from '../common/schemas';
import { PositiveInteger, PositiveIntegerGreaterThanZero } from '../types';

export const signalsReindexOptions = t.partial({
  requests_per_second: t.number,
  size: PositiveIntegerGreaterThanZero,
  slices: PositiveInteger,
});

export type SignalsReindexOptions = t.TypeOf<typeof signalsReindexOptions>;

export const createSignalsMigrationSchema = t.intersection([
  t.exact(
    t.type({
      index,
    })
  ),
  t.exact(signalsReindexOptions),
]);

export type CreateSignalsMigrationSchema = t.TypeOf<typeof createSignalsMigrationSchema>;
