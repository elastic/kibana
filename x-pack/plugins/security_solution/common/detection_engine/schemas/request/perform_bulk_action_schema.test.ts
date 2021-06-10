/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performBulkActionSchema, PerformBulkActionSchema } from './perform_bulk_action_schema';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { left } from 'fp-ts/lib/Either';
import { BulkAction } from '../common/schemas';

describe('perform_bulk_action_schema', () => {
  test('query and action is valid', () => {
    const payload: PerformBulkActionSchema = {
      query: 'name: test',
      action: BulkAction.enable,
    };

    const decoded = performBulkActionSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('missing query is valid', () => {
    const payload: PerformBulkActionSchema = {
      query: undefined,
      action: BulkAction.enable,
    };

    const decoded = performBulkActionSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('missing action is invalid', () => {
    const payload: Omit<PerformBulkActionSchema, 'action'> = {
      query: 'name: test',
    };

    const decoded = performBulkActionSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "action"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('unknown action is invalid', () => {
    const payload: Omit<PerformBulkActionSchema, 'action'> & { action: 'unknown' } = {
      query: 'name: test',
      action: 'unknown',
    };

    const decoded = performBulkActionSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = foldLeftRight(checked);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "unknown" supplied to "action"',
    ]);
    expect(message.schema).toEqual({});
  });
});
