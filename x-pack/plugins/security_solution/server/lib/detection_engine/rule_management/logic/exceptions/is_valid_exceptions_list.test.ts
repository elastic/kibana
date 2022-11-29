/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { List } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { isValidExceptionList } from './is_valid_exceptions_list';
import { requestContextMock } from '../../../routes/__mocks__';
import { getQueryRuleParams } from '../../../rule_schema/mocks';
import {
  getEmptyFindResult,
  getFindResultWithSingleHit,
  getRuleMock,
} from '../../../routes/__mocks__/request_responses';

const notDefaultExceptionList: List = {
  id: '1',
  list_id: '2345',
  namespace_type: 'single',
  type: ExceptionListTypeEnum.DETECTION,
};
const defaultExceptionList: List = {
  id: '2',
  list_id: '123',
  namespace_type: 'single',
  type: ExceptionListTypeEnum.RULE_DEFAULT,
};

describe('isValidExceptionList', () => {
  const { clients } = requestContextMock.createTools();

  beforeEach(() => {
    clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
  });

  it('returns true if there no exceptionsList', async () => {
    const result = await isValidExceptionList({
      ruleId: '1',
      exceptionsList: undefined,
      rulesClient: clients.rulesClient,
    });
    expect(result).toEqual(true);
  });

  it('returns true if there default exceptions list', async () => {
    const result = await isValidExceptionList({
      ruleId: '1',
      exceptionsList: [notDefaultExceptionList],
      rulesClient: clients.rulesClient,
    });
    expect(result).toEqual(true);
  });

  it('throw error if there more than one rule default exeptions', async () => {
    await expect(
      isValidExceptionList({
        ruleId: '1',
        exceptionsList: [defaultExceptionList, defaultExceptionList],
        rulesClient: clients.rulesClient,
      })
    ).rejects.toThrow('More than one default exception list found on rule');
  });

  it('return true if there no rules with this exceptions', async () => {
    const result = await isValidExceptionList({
      ruleId: '1',
      exceptionsList: [defaultExceptionList],
      rulesClient: clients.rulesClient,
    });
    expect(result).toEqual(true);
  });

  it('return false if there more than 1 rule with exceptions', async () => {
    clients.rulesClient.find.mockResolvedValue({
      ...getFindResultWithSingleHit(),
      data: [
        {
          ...getRuleMock({
            ...getQueryRuleParams(),
          }),
        },
        {
          ...getRuleMock({
            ...getQueryRuleParams(),
          }),
        },
      ],
    });

    const result = await isValidExceptionList({
      ruleId: '1',
      exceptionsList: [defaultExceptionList],
      rulesClient: clients.rulesClient,
    });
    expect(result).toEqual(false);
  });

  it('return true if there rule default list in this rule', async () => {
    clients.rulesClient.find.mockResolvedValue({
      ...getFindResultWithSingleHit(),
      data: [
        {
          ...getRuleMock({
            ...getQueryRuleParams(),
          }),
          id: '1',
        },
      ],
    });

    const result = await isValidExceptionList({
      ruleId: '1',
      exceptionsList: [defaultExceptionList],
      rulesClient: clients.rulesClient,
    });
    expect(result).toEqual(true);
  });

  it('return false if there rule default list in other rule', async () => {
    clients.rulesClient.find.mockResolvedValue({
      ...getFindResultWithSingleHit(),
      data: [
        {
          ...getRuleMock({
            ...getQueryRuleParams(),
          }),
        },
      ],
    });

    const result = await isValidExceptionList({
      ruleId: '1',
      exceptionsList: [defaultExceptionList],
      rulesClient: clients.rulesClient,
    });
    expect(result).toEqual(false);
  });
});
