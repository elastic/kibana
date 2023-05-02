/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { duplicateExceptions } from './duplicate_exceptions';
import { getExceptionListClientMock } from '@kbn/lists-plugin/server/services/exception_lists/exception_list_client.mock';
import type { List } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import { getDetectionsExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';

jest.mock('uuid', () => ({
  v4: jest.fn(),
}));

describe('duplicateExceptions', () => {
  let exceptionsClient: ExceptionListClient;

  beforeAll(() => {
    exceptionsClient = getExceptionListClientMock();
    exceptionsClient.duplicateExceptionListAndItems = jest.fn();
  });

  afterAll(() => {
    jest.clearAllMocks();
  });

  it('returns empty array if no exceptions to duplicate', async () => {
    const result = await duplicateExceptions({
      ruleId: 'rule_123',
      exceptionLists: [],
      exceptionsClient,
      includeExpiredExceptions: false,
    });

    expect(result).toEqual([]);
  });

  it('returns array referencing the same shared exception lists if no rule default exceptions included', async () => {
    const sharedExceptionListReference: List = {
      type: ExceptionListTypeEnum.DETECTION,
      list_id: 'my_list',
      namespace_type: 'single',
      id: '1234',
    };

    const result = await duplicateExceptions({
      ruleId: 'rule_123',
      exceptionLists: [sharedExceptionListReference],
      exceptionsClient,
      includeExpiredExceptions: false,
    });

    expect(exceptionsClient.duplicateExceptionListAndItems).not.toHaveBeenCalled();
    expect(result).toEqual([sharedExceptionListReference]);
  });

  it('duplicates rule default and shared exceptions', async () => {
    const newDefaultRuleList = {
      ...getDetectionsExceptionListSchemaMock(),
      type: ExceptionListTypeEnum.RULE_DEFAULT,
      list_id: 'rule_default_list_dupe',
      namespace_type: 'single',
      id: '123-abc',
    };

    exceptionsClient.getExceptionList = jest.fn().mockResolvedValue({
      ...getDetectionsExceptionListSchemaMock(),
      type: ExceptionListTypeEnum.RULE_DEFAULT,
      list_id: 'rule_default_list',
      namespace_type: 'single',
      id: '5678',
    });
    exceptionsClient.duplicateExceptionListAndItems = jest
      .fn()
      .mockResolvedValue(newDefaultRuleList);

    const sharedExceptionListReference: List = {
      type: ExceptionListTypeEnum.DETECTION,
      list_id: 'my_list',
      namespace_type: 'single',
      id: '1234',
    };

    const ruleDefaultListReference: List = {
      type: ExceptionListTypeEnum.RULE_DEFAULT,
      list_id: 'rule_default_list',
      namespace_type: 'single',
      id: '5678',
    };

    const result = await duplicateExceptions({
      ruleId: 'rule_123',
      exceptionLists: [sharedExceptionListReference, ruleDefaultListReference],
      exceptionsClient,
      includeExpiredExceptions: false,
    });

    expect(result).toEqual([
      sharedExceptionListReference,
      {
        type: newDefaultRuleList.type,
        namespace_type: newDefaultRuleList.namespace_type,
        id: newDefaultRuleList.id,
        list_id: newDefaultRuleList.list_id,
      },
    ]);
  });

  it('throws error if rule default list to duplicate not found', async () => {
    exceptionsClient.getExceptionList = jest.fn().mockResolvedValue(null);

    const ruleDefaultListReference: List = {
      type: ExceptionListTypeEnum.RULE_DEFAULT,
      list_id: 'my_list',
      namespace_type: 'single',
      id: '1234',
    };

    await expect(() =>
      duplicateExceptions({
        ruleId: 'rule_123',
        exceptionLists: [ruleDefaultListReference],
        exceptionsClient,
        includeExpiredExceptions: false,
      })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Unable to duplicate rule default exceptions - unable to find their container with list_id: "my_list"]`
    );
  });

  it('throws error if list duplication returns null', async () => {
    exceptionsClient.getExceptionList = jest.fn().mockResolvedValue({
      ...getDetectionsExceptionListSchemaMock(),
      type: ExceptionListTypeEnum.RULE_DEFAULT,
      list_id: 'my_list',
      namespace_type: 'single',
      id: '1234',
    });
    exceptionsClient.duplicateExceptionListAndItems = jest.fn().mockResolvedValue(null);

    const ruleDefaultListReference: List = {
      type: ExceptionListTypeEnum.RULE_DEFAULT,
      list_id: 'my_list',
      namespace_type: 'single',
      id: '1234',
    };

    await expect(() =>
      duplicateExceptions({
        ruleId: 'rule_123',
        exceptionLists: [ruleDefaultListReference],
        exceptionsClient,
        includeExpiredExceptions: false,
      })
    ).rejects.toMatchInlineSnapshot(
      `[Error: Unable to duplicate rule default exception items for rule_id: rule_123]`
    );
  });
});
