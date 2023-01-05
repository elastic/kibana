/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ListArray } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { checkDefaultRuleExceptionListReferences } from './check_for_default_rule_exception_list';

describe('checkDefaultRuleExceptionListReferences', () => {
  it('returns undefined if "exceptionLists" is undefined', () => {
    const result = checkDefaultRuleExceptionListReferences({
      exceptionLists: undefined,
    });

    expect(result).toBeUndefined();
  });

  it('returns "exceptionLists" if it does not contain more than one default rule exception list', () => {
    const lists: ListArray = [
      {
        id: '2',
        list_id: '123',
        namespace_type: 'single',
        type: ExceptionListTypeEnum.RULE_DEFAULT,
      },
      {
        id: '1',
        list_id: '456',
        namespace_type: 'single',
        type: ExceptionListTypeEnum.DETECTION,
      },
    ];
    const result = checkDefaultRuleExceptionListReferences({
      exceptionLists: lists,
    });

    expect(result).toEqual(lists);
  });

  it('throws error if "exceptionLists" contains more than one default rule exception list', () => {
    const lists: ListArray = [
      {
        id: '2',
        list_id: '123',
        namespace_type: 'single',
        type: ExceptionListTypeEnum.RULE_DEFAULT,
      },
      {
        id: '1',
        list_id: '456',
        namespace_type: 'single',
        type: ExceptionListTypeEnum.RULE_DEFAULT,
      },
    ];

    expect(() =>
      checkDefaultRuleExceptionListReferences({
        exceptionLists: lists,
      })
    ).toThrowErrorMatchingInlineSnapshot(`"More than one default exception list found on rule"`);
  });
});
