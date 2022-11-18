/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { duplicateExceptions } from './duplicate_exceptions';
import type { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

const defaultList = {
  id: '3',
  list_id: '3',
  type: ExceptionListTypeEnum.RULE_DEFAULT,
  namespace_type: 'single' as NamespaceType,
};
const sharedLists = [
  {
    id: '1',
    list_id: '1',
    type: ExceptionListTypeEnum.DETECTION,
    namespace_type: 'single' as NamespaceType,
  },
  {
    id: '2',
    list_id: '2',
    type: ExceptionListTypeEnum.DETECTION,
    namespace_type: 'single' as NamespaceType,
  },
];
describe('duplicateExceptions', () => {
  it('returns empty array if exceptionLists is [] ', async () => {
    const result = await duplicateExceptions({
      ruleId: '1',
      exceptionLists: [],
      exceptionsClient: undefined,
    });

    expect(result).toEqual([]);
  });

  it('copied shared lists', async () => {
    const result = await duplicateExceptions({
      ruleId: '1',
      exceptionLists: sharedLists,
      exceptionsClient: undefined,
    });

    expect(result).toEqual(sharedLists);
  });

  it('copied default lists', async () => {
    const mockCallback = jest.fn((list) => ({
      id: `new_${list.listId}`,
      list_id: `new_${list.listId}`,
      type: ExceptionListTypeEnum.RULE_DEFAULT,
      namespace_type: 'single',
    }));

    // only want to mock one function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exceptionsClient: any = { duplicateExceptionListAndItems: mockCallback };

    const result = await duplicateExceptions({
      ruleId: '1',
      exceptionLists: [defaultList, ...sharedLists],
      exceptionsClient,
    });

    expect(result).toEqual([
      ...sharedLists,
      {
        id: `new_3`,
        list_id: `new_3`,
        type: ExceptionListTypeEnum.RULE_DEFAULT,
        namespace_type: 'single',
      },
    ]);
  });
});
