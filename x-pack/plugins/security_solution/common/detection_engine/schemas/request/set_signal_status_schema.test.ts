/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { setSignalsStatusSchema, SetSignalsStatusSchema } from './set_signal_status_schema';
import { exactCheck } from '../../../exact_check';
import { pipe } from 'fp-ts/lib/pipeable';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { left } from 'fp-ts/lib/Either';

describe('set signal status schema', () => {
  test('signal_ids and status is valid', () => {
    const payload: SetSignalsStatusSchema = {
      signal_ids: ['somefakeid'],
      status: 'open',
    };

    const decoded = setSignalsStatusSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('query and status is valid', () => {
    const payload: SetSignalsStatusSchema = {
      query: {},
      status: 'open',
    };

    const decoded = setSignalsStatusSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('signal_ids and missing status is invalid', () => {
    const payload: Omit<SetSignalsStatusSchema, 'status'> = {
      signal_ids: ['somefakeid'],
    };

    const decoded = setSignalsStatusSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "status"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('query and missing status is invalid', () => {
    const payload: Omit<SetSignalsStatusSchema, 'status'> = {
      query: {},
    };

    const decoded = setSignalsStatusSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "status"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('signal_ids is present but status has wrong value', () => {
    const payload: Omit<SetSignalsStatusSchema, 'status'> & { status: 'fakeVal' } = {
      query: {},
      status: 'fakeVal',
    };

    const decoded = setSignalsStatusSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "fakeVal" supplied to "status"',
    ]);
    expect(message.schema).toEqual({});
  });
});
