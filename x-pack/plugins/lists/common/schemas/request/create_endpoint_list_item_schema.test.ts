/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';
import { getCreateCommentsArrayMock } from '../types/create_comments.mock';
import { getCommentsMock } from '../types/comments.mock';
import { CommentsArray } from '../types';

import {
  CreateEndpointListItemSchema,
  createEndpointListItemSchema,
} from './create_endpoint_list_item_schema';
import { getCreateEndpointListItemSchemaMock } from './create_endpoint_list_item_schema.mock';

describe('create_endpoint_list_item_schema', () => {
  test('it should validate a typical list item request not counting the auto generated uuid', () => {
    const payload = getCreateEndpointListItemSchemaMock();
    const decoded = createEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateEndpointListItemSchema).item_id;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should not validate an undefined for "description"', () => {
    const payload = getCreateEndpointListItemSchemaMock();
    delete payload.description;
    const decoded = createEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "description"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate an undefined for "name"', () => {
    const payload = getCreateEndpointListItemSchemaMock();
    delete payload.name;
    const decoded = createEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "name"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate an undefined for "type"', () => {
    const payload = getCreateEndpointListItemSchemaMock();
    delete payload.type;
    const decoded = createEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "type"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should not validate a "list_id" since it does not required one', () => {
    const inputPayload: CreateEndpointListItemSchema & { list_id: string } = {
      ...getCreateEndpointListItemSchemaMock(),
      list_id: 'list-123',
    };
    const decoded = createEndpointListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "list_id"']);
    expect(message.schema).toEqual({});
  });

  test('it should not validate a "namespace_type" since it does not required one', () => {
    const inputPayload: CreateEndpointListItemSchema & { namespace_type: string } = {
      ...getCreateEndpointListItemSchemaMock(),
      namespace_type: 'single',
    };
    const decoded = createEndpointListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "namespace_type"']);
    expect(message.schema).toEqual({});
  });

  test('it should validate an undefined for "meta" but strip it out and generate a correct body not counting the auto generated uuid', () => {
    const payload = getCreateEndpointListItemSchemaMock();
    const outputPayload = getCreateEndpointListItemSchemaMock();
    delete payload.meta;
    delete outputPayload.meta;
    const decoded = createEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateEndpointListItemSchema).item_id;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should validate an undefined for "comments" but return an array and generate a correct body not counting the auto generated uuid', () => {
    const inputPayload = getCreateEndpointListItemSchemaMock();
    const outputPayload = getCreateEndpointListItemSchemaMock();
    delete inputPayload.comments;
    outputPayload.comments = [];
    const decoded = createEndpointListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateEndpointListItemSchema).item_id;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should validate "comments" array', () => {
    const inputPayload = {
      ...getCreateEndpointListItemSchemaMock(),
      comments: getCreateCommentsArrayMock(),
    };
    const decoded = createEndpointListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateEndpointListItemSchema).item_id;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(inputPayload);
  });

  test('it should NOT validate "comments" with "created_at" or "created_by" values', () => {
    const inputPayload: Omit<CreateEndpointListItemSchema, 'comments'> & {
      comments?: CommentsArray;
    } = {
      ...getCreateEndpointListItemSchemaMock(),
      comments: [getCommentsMock()],
    };
    const decoded = createEndpointListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "created_at,created_by"']);
    expect(message.schema).toEqual({});
  });

  test('it should validate an undefined for "entries" but return an array', () => {
    const inputPayload = getCreateEndpointListItemSchemaMock();
    const outputPayload = getCreateEndpointListItemSchemaMock();
    delete inputPayload.entries;
    outputPayload.entries = [];
    const decoded = createEndpointListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateEndpointListItemSchema).item_id;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should validate an undefined for "tags" but return an array and generate a correct body not counting the auto generated uuid', () => {
    const inputPayload = getCreateEndpointListItemSchemaMock();
    const outputPayload = getCreateEndpointListItemSchemaMock();
    delete inputPayload.tags;
    outputPayload.tags = [];
    const decoded = createEndpointListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateEndpointListItemSchema).item_id;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should validate an undefined for "_tags" but return an array and generate a correct body not counting the auto generated uuid', () => {
    const inputPayload = getCreateEndpointListItemSchemaMock();
    const outputPayload = getCreateEndpointListItemSchemaMock();
    delete inputPayload._tags;
    outputPayload._tags = [];
    const decoded = createEndpointListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateEndpointListItemSchema).item_id;
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(outputPayload);
  });

  test('it should validate an undefined for "item_id" and auto generate a uuid', () => {
    const inputPayload = getCreateEndpointListItemSchemaMock();
    delete inputPayload.item_id;
    const decoded = createEndpointListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as CreateEndpointListItemSchema).item_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  test('it should validate an undefined for "item_id" and generate a correct body not counting the uuid', () => {
    const inputPayload = getCreateEndpointListItemSchemaMock();
    delete inputPayload.item_id;
    const decoded = createEndpointListItemSchema.decode(inputPayload);
    const checked = exactCheck(inputPayload, decoded);
    const message = pipe(checked, foldLeftRight);
    delete (message.schema as CreateEndpointListItemSchema).item_id;
    expect(message.schema).toEqual(inputPayload);
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: CreateEndpointListItemSchema & {
      extraKey: string;
    } = { ...getCreateEndpointListItemSchemaMock(), extraKey: 'some new value' };
    const decoded = createEndpointListItemSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
