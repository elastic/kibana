/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';

import { exactCheck, foldLeftRight, getPaths } from '../../siem_common_deps';

import { getExceptionListSchemaMock } from './exception_list_schema.mock';
import { CreateEndpointListSchema, createEndpointListSchema } from './create_endpoint_list_schema';

describe('create_endpoint_list_schema', () => {
  test('it should validate a typical endpoint list response', () => {
    const payload = getExceptionListSchemaMock();
    const decoded = createEndpointListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should accept an empty object when an endpoint list already exists', () => {
    const payload: CreateEndpointListSchema = {};
    const decoded = createEndpointListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual(payload);
  });

  test('it should NOT accept an undefined for "list_id"', () => {
    const payload = getExceptionListSchemaMock();
    delete payload.list_id;
    const decoded = createEndpointListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([
      'invalid keys "_tags,["endpoint","process","malware","os:linux"],created_at,created_by,description,id,meta,{},name,namespace_type,tags,["user added string for a tag","malware"],tie_breaker_id,type,updated_at,updated_by"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('it should NOT allow missing fields', () => {
    const payload = getExceptionListSchemaMock();
    delete payload.list_id;
    const decoded = createEndpointListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors)).length).toEqual(1);
    expect(message.schema).toEqual({});
  });

  test('it should not allow an extra key to be sent in', () => {
    const payload: CreateEndpointListSchema & {
      extraKey?: string;
    } = getExceptionListSchemaMock();
    payload.extraKey = 'some new value';
    const decoded = createEndpointListSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "extraKey"']);
    expect(message.schema).toEqual({});
  });
});
