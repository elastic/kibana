/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DefaultActionsArray } from './default_actions_array';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { foldLeftRight, getPaths } from '../../../test_utils';
import { Actions } from '../common/schemas';

describe('default_actions_array', () => {
  test('it should validate an empty array', () => {
    const payload: string[] = [];
    const decoded = DefaultActionsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should validate an array of actions', () => {
    const payload: Actions = [
      { id: '123', group: 'group', action_type_id: 'action_type_id', params: {} },
    ];
    const decoded = DefaultActionsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an array with a number', () => {
    const payload = [
      { id: '123', group: 'group', action_type_id: 'action_type_id', params: {} },
      5,
    ];
    const decoded = DefaultActionsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "5" supplied to "DefaultActionsArray"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should return a default array entry', () => {
    const payload = null;
    const decoded = DefaultActionsArray.decode(payload);
    const message = pipe(decoded, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual([]);
  });
});
