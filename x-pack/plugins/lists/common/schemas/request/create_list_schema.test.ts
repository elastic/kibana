/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import { getListRequest } from './mocks/utils';
import { CreateListSchema, CreateListSchemaPartial, createListSchema } from './create_list_schema';

describe('create_list_schema', () => {
  test('it should validate a typical lists request', () => {
    const payload = getListRequest();
    const decoded = createListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    const expected: CreateListSchemaPartial = {
      description: 'Description of a list item',
      id: 'some-list-id',
      meta: {},
      name: 'Name of a list item',
      type: 'ip',
    };
    expect(message.schema).toEqual(expected);
  });

  test('it should accept an undefined for an id', () => {
    const payload = getListRequest();
    delete payload.id;
    const decoded = createListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    const expected: CreateListSchemaPartial = {
      description: 'Description of a list item',
      meta: {},
      name: 'Name of a list item',
      type: 'ip',
    };
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(expected);
  });

  test('it should accept an undefined for meta', () => {
    const payload = getListRequest();
    delete payload.meta;
    const decoded = createListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    const expected: CreateListSchemaPartial = {
      description: 'Description of a list item',
      id: 'some-list-id',
      name: 'Name of a list item',
      type: 'ip',
    };
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(expected);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: CreateListSchema & { extraKey?: string } = getListRequest();
    payload.extraKey = 'some new value';
    const decoded = createListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
