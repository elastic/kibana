/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as t from 'io-ts';
import { PositiveIntegerGreaterThanZero } from '../types/positive_integer_greater_than_zero';

export const querySignalsSchema = t.exact(
  t.partial({
    query: t.object,
    aggs: t.object,
    size: PositiveIntegerGreaterThanZero,
    track_total_hits: t.boolean,
    _source: t.array(t.string),
  })
);

export type QuerySignalsSchema = t.TypeOf<typeof querySignalsSchema>;
export type QuerySignalsSchemaDecoded = QuerySignalsSchema;
