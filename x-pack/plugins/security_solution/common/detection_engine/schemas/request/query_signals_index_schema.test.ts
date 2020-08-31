/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QuerySignalsSchema, querySignalsSchema } from './query_signals_index_schema';
import { exactCheck } from '../../../exact_check';
import { pipe } from 'fp-ts/lib/pipeable';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { left } from 'fp-ts/lib/Either';

describe('query, aggs, size, _source and track_total_hits on signals index', () => {
  test('query, aggs, size, _source and track_total_hits simultaneously', () => {
    const payload: QuerySignalsSchema = {
      query: {},
      aggs: {},
      size: 1,
      track_total_hits: true,
      _source: ['field'],
    };

    const decoded = querySignalsSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('query, only', () => {
    const payload: QuerySignalsSchema = {
      query: {},
    };

    const decoded = querySignalsSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('aggs only', () => {
    const payload: QuerySignalsSchema = {
      aggs: {},
    };

    const decoded = querySignalsSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('size only', () => {
    const payload: QuerySignalsSchema = {
      size: 1,
    };

    const decoded = querySignalsSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('track_total_hits only', () => {
    const payload: QuerySignalsSchema = {
      track_total_hits: true,
    };

    const decoded = querySignalsSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('_source only', () => {
    const payload: QuerySignalsSchema = {
      _source: ['field'],
    };

    const decoded = querySignalsSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });
});
