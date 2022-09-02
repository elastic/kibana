/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { exactCheck, foldLeftRight, getPaths } from '@kbn/securitysolution-io-ts-utils';
import { pipe } from 'fp-ts/lib/pipeable';
import { left } from 'fp-ts/lib/Either';
import { createRuleExceptionsSchema } from './create_rule_exception_schema';
import type { CreateRuleExceptionSchema } from './create_rule_exception_schema';

import { getCreateExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_exception_list_item_schema.mock';

describe('createRuleExceptionsSchema', () => {
  test('empty objects do not validate', () => {
    const payload: CreateRuleExceptionSchema = {} as CreateRuleExceptionSchema;

    const decoded = createRuleExceptionsSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "undefined" supplied to "items"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('items without list_id validate', () => {
    const payload: CreateRuleExceptionSchema = {
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

    const decoded = createRuleExceptionsSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);

    expect(getPaths(left(message.errors))).toEqual([]);
    expect((message.schema as CreateRuleExceptionSchema).items[0]).toEqual(
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
    } as unknown as CreateRuleExceptionSchema;

    const decoded = createRuleExceptionsSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual([
      'Invalid value "some-list-id" supplied to "items,list_id"',
    ]);
    expect(message.schema).toEqual({});
  });

  test('made up parameters do not validate', () => {
    const payload: Partial<CreateRuleExceptionSchema> & { madeUp: string } = {
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

    const decoded = createRuleExceptionsSchema.decode(payload);
    const checked = exactCheck(payload, decoded);
    const message = pipe(checked, foldLeftRight);
    expect(getPaths(left(message.errors))).toEqual(['invalid keys "madeUp"']);
    expect(message.schema).toEqual({});
  });
});
