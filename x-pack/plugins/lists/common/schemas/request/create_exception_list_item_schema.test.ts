/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../shared_imports';
import { getCreateCommentsArrayMock } from '../types/create_comment.mock';
import { getCommentsMock } from '../types/comment.mock';
import { CommentsArray } from '../types';

import {
  CreateExceptionListItemSchema,
  createExceptionListItemSchema,
} from './create_exception_list_item_schema';
import { getCreateExceptionListItemSchemaMock } from './create_exception_list_item_schema.mock';

describe('create_exception_list_item_schema', () => {
  test('it should pass validation when supplied a typical exception list item request not counting the auto generated uuid', () => {
    const payload = getCreateExceptionListItemSchemaMock();
    const decoded = createExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateExceptionListItemSchema).item_id;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should fail validation when supplied an undefined for "description"', () => {
    const payload = getCreateExceptionListItemSchemaMock();
    // @ts-expect-error
    delete payload.description;
    const decoded = createExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "description"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should fail validation when supplied an undefined for "name"', () => {
    const payload = getCreateExceptionListItemSchemaMock();
    // @ts-expect-error
    delete payload.name;
    const decoded = createExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "name"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should fail validation when supplied an undefined for "type"', () => {
    const payload = getCreateExceptionListItemSchemaMock();
    // @ts-expect-error
    delete payload.type;
    const decoded = createExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should fail validation when supplied an undefined for "list_id"', () => {
    const inputPayload = getCreateExceptionListItemSchemaMock();
    // @ts-expect-error
    delete inputPayload.list_id;
    const decoded = createExceptionListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "list_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should pass validation when supplied an undefined for "meta" but strip it out and generate a correct body not counting the auto generated uuid', () => {
    const payload = getCreateExceptionListItemSchemaMock();
    const outputPayload = getCreateExceptionListItemSchemaMock();
    delete payload.meta;
    delete outputPayload.meta;
    const decoded = createExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateExceptionListItemSchema).item_id;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should pass validation when supplied an undefined for "comments" but return an array and generate a correct body not counting the auto generated uuid', () => {
    const inputPayload = getCreateExceptionListItemSchemaMock();
    const outputPayload = getCreateExceptionListItemSchemaMock();
    delete inputPayload.comments;
    outputPayload.comments = [];
    const decoded = createExceptionListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateExceptionListItemSchema).item_id;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should pass validation when supplied "comments" array', () => {
    const inputPayload = {
      ...getCreateExceptionListItemSchemaMock(),
      comments: getCreateCommentsArrayMock(),
    };
    const decoded = createExceptionListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateExceptionListItemSchema).item_id;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(inputPayload);
  });

  test('it should fail validation when supplied "comments" with "created_at" or "created_by" values', () => {
    const inputPayload: Omit<CreateExceptionListItemSchema, 'comments'> & {
      comments?: CommentsArray;
    } = {
      ...getCreateExceptionListItemSchemaMock(),
      comments: [getCommentsMock()],
    };
    const decoded = createExceptionListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "created_at,created_by,id"']);
    expect(message.schema).toEqual({});
  });

  test('it should fail validation when supplied an undefined for "entries"', () => {
    const inputPayload = getCreateExceptionListItemSchemaMock();
    const outputPayload = getCreateExceptionListItemSchemaMock();
    // @ts-expect-error
    delete inputPayload.entries;
    outputPayload.entries = [];
    const decoded = createExceptionListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateExceptionListItemSchema).item_id;
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "entries"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should pass validation when supplied an undefined for "namespace_type" but return enum "single" and generate a correct body not counting the auto generated uuid', () => {
    const inputPayload = getCreateExceptionListItemSchemaMock();
    const outputPayload = getCreateExceptionListItemSchemaMock();
    delete inputPayload.namespace_type;
    outputPayload.namespace_type = 'single';
    const decoded = createExceptionListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateExceptionListItemSchema).item_id;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should pass validation when supplied an undefined for "tags" but return an array and generate a correct body not counting the auto generated uuid', () => {
    const inputPayload = getCreateExceptionListItemSchemaMock();
    const outputPayload = getCreateExceptionListItemSchemaMock();
    delete inputPayload.tags;
    outputPayload.tags = [];
    const decoded = createExceptionListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateExceptionListItemSchema).item_id;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should pass validation when supplied an undefined for "_tags" but return an array and generate a correct body not counting the auto generated uuid', () => {
    const inputPayload = getCreateExceptionListItemSchemaMock();
    const outputPayload = getCreateExceptionListItemSchemaMock();
    delete inputPayload._tags;
    outputPayload._tags = [];
    const decoded = createExceptionListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateExceptionListItemSchema).item_id;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should pass validation when supplied an undefined for "item_id" and auto generate a uuid', () => {
    const inputPayload = getCreateExceptionListItemSchemaMock();
    delete inputPayload.item_id;
    const decoded = createExceptionListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as CreateExceptionListItemSchema).item_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  test('it should pass validation when supplied an undefined for "item_id" and generate a correct body not counting the uuid', () => {
    const inputPayload = getCreateExceptionListItemSchemaMock();
    delete inputPayload.item_id;
    const decoded = createExceptionListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateExceptionListItemSchema).item_id;
    expect(message.schema).toEqual(inputPayload);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: CreateExceptionListItemSchema & {
      extraKey?: string;
    } = getCreateExceptionListItemSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = createExceptionListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
