/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { performBulkActionSchema, PerformBulkActionSchema } from './perform_bulk_action_schema';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { left } from 'fp-ts/lib/Either';
import { BulkAction, BulkActionUpdateType } from '../common/schemas';

const retrieveValidationMessage = (payload: PerformBulkActionSchema) => {
  const decoded = performBulkActionSchema.decode(payload);
  const checked = exactCheck(payload, decoded);
  return foldLeftRight(checked);
};

describe('perform_bulk_action_schema', () => {
  test('query and action is valid', () => {
    const payload: PerformBulkActionSchema = {
      query: 'name: test',
      action: BulkAction.enable,
    };
    const message = retrieveValidationMessage(payload);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('missing query is valid', () => {
    const payload: PerformBulkActionSchema = {
      query: undefined,
      action: BulkAction.enable,
    };
    const message = retrieveValidationMessage(payload);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('missing action is invalid', () => {
    const payload: Omit<PerformBulkActionSchema, 'action'> = {
      query: 'name: test',
    };
    const message = retrieveValidationMessage(payload as PerformBulkActionSchema);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "action"',
      'Invalid value "undefined" supplied to "updates"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('unknown action is invalid', () => {
    const payload: Omit<PerformBulkActionSchema, 'action'> & { action: 'unknown' } = {
      query: 'name: test',
      action: 'unknown',
    };
    const message = retrieveValidationMessage(payload as unknown as PerformBulkActionSchema);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "unknown" supplied to "action"',
      'Invalid value "undefined" supplied to "updates"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('missing updates array is invalid when action type is update', () => {
    const payload = {
      query: 'name: test',
      action: BulkAction.update,
    };

    const message = retrieveValidationMessage(payload as PerformBulkActionSchema);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "update" supplied to "action"',
      'Invalid value "undefined" supplied to "updates"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('updates property is invalid when action is not update', () => {
    const payload = {
      query: 'name: test',
      action: BulkAction.enable,
      updates: [{ type: BulkActionUpdateType.set_tags, value: ['test-tag'] }],
    };

    const message = retrieveValidationMessage(payload);

    expect(getPaths(left(message.errors))).toEqual([
      'invalid keys "updates,[{"type":"set_tags","value":["test-tag"]}]"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('updates property is valid when action is update', () => {
    const payload: PerformBulkActionSchema = {
      query: 'name: test',
      action: BulkAction.update,
      updates: [{ type: BulkActionUpdateType.set_tags, value: ['test-tag'] }],
    };

    const message = retrieveValidationMessage(payload);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });
});
