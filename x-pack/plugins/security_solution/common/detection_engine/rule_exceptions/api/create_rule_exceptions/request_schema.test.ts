/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { left } from 'fp-ts/lib/Either';
import { pipe } from 'fp-ts/lib/pipeable';
import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';

import { getCreateExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';
import {
  CreateRuleExceptionsRequestBody,
  CreateRuleExceptionsRequestParams,
} from './request_schema';

describe('CreateRuleExceptionsRequestParams', () => {
  test('empty objects do not validate', () => {
    const payload: Partial<CreateRuleExceptionsRequestParams> = {};

    const decoded = CreateRuleExceptionsRequestParams.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['Invalid value "undefined" supplied to "id"']);
    expect(message.schema).toEqual({});
  });

  test('validates string for id', () => {
    const payload: Partial<CreateRuleExceptionsRequestParams> = {
      id: '4656dc92-5832-11ea-8e2d-0242ac130003',
    };

    const decoded = CreateRuleExceptionsRequestParams.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([]);
    expect(message.schema).toEqual({
      id: '4656dc92-5832-11ea-8e2d-0242ac130003',
    });
  });
});

describe('CreateRuleExceptionsRequestBody', () => {
  test('empty objects do not validate', () => {
    const payload: CreateRuleExceptionsRequestBody = {} as CreateRuleExceptionsRequestBody;

    const decoded = CreateRuleExceptionsRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "items"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('items without list_id validate', () => {
    const payload: CreateRuleExceptionsRequestBody = {
      items: [
        {
          description: 'Exception item for rule default exception list',
          entries: [
            {
              field: 'some.not.nested.field',
              operator: 'included',
              type: 'match',
              value: 'some value',
            },
          ],
          name: 'Sample exception item',
          type: 'simple',
        },
      ],
    };

    const decoded = CreateRuleExceptionsRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as CreateRuleExceptionsRequestBody).items[0]).toEqual(
      expect.objectContaining({
        comments: [],
        description: 'Exception item for rule default exception list',
        entries: [
          {
            field: 'some.not.nested.field',
            operator: 'included',
            type: 'match',
            value: 'some value',
          },
        ],
        name: 'Sample exception item',
        os_types: [],
        tags: [],
        type: 'simple',
      })
    );
  });

  test('items with list_id do not validate', () => {
    const payload = {
      items: [getCreateExceptionListItemSchemaMock()],
    } as unknown as CreateRuleExceptionsRequestBody;

    const decoded = CreateRuleExceptionsRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some-list-id" supplied to "items,list_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('made up parameters do not validate', () => {
    const payload: Partial<CreateRuleExceptionsRequestBody> & { madeUp: string } = {
      items: [
        {
          description: 'Exception item for rule default exception list',
          entries: [
            {
              field: 'some.not.nested.field',
              operator: 'included',
              type: 'match',
              value: 'some value',
            },
          ],
          name: 'Sample exception item',
          type: 'simple',
        },
      ],
      madeUp: 'invalid value',
    };

    const decoded = CreateRuleExceptionsRequestBody.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeUp"']);
    expect(message.schema).toEqual({});
  });
});
