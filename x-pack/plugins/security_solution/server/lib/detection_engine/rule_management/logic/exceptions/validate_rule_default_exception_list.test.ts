/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { List } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { validateRuleDefaultExceptionList } from './validate_rule_default_exception_list';
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

describe('validateRuleDefaultExceptionList', () => {
  const { clients } = requestContextMock.createTools();

  beforeEach(() => {
    clients.rulesClient.find.mockResolvedValue(getEmptyFindResult());
  });

  it('is valid if there no exceptionsList', async () => {
    const result = await validateRuleDefaultExceptionList({
      ruleId: '1',
      ruleRuleId: undefined,
      exceptionsList: undefined,
      rulesClient: clients.rulesClient,
    });
    expect(result).toBeUndefined();
  });

  it('is valid if there default exceptions list', async () => {
    const result = await validateRuleDefaultExceptionList({
      ruleId: '1',
      ruleRuleId: undefined,
      exceptionsList: [notDefaultExceptionList],
      rulesClient: clients.rulesClient,
    });
    expect(result).toBeUndefined();
  });

  it('throw error if there more than one rule default exeptions', async () => {
    await expect(
      validateRuleDefaultExceptionList({
        ruleId: '1',
        ruleRuleId: undefined,
        exceptionsList: [defaultExceptionList, defaultExceptionList],
        rulesClient: clients.rulesClient,
      })
    ).rejects.toThrow('More than one default exception list found on rule');
  });

  it('is valid if there no rules with this exceptions', async () => {
    const result = await validateRuleDefaultExceptionList({
      ruleId: '1',
      ruleRuleId: undefined,
      exceptionsList: [defaultExceptionList],
      rulesClient: clients.rulesClient,
    });
    expect(result).toBeUndefined();
  });

  it('throw error if there more than 1 rule with exceptions', async () => {
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

    await expect(
      validateRuleDefaultExceptionList({
        ruleId: '1',
        ruleRuleId: undefined,
        exceptionsList: [defaultExceptionList],
        rulesClient: clients.rulesClient,
      })
    ).rejects.toThrow(
      'default exception list for rule: 1 already exists in rule(s): 04128c15-0d1b-4716-a4c5-46997ac7f3bd,04128c15-0d1b-4716-a4c5-46997ac7f3bd'
    );
  });

  it('is valid if there rule default list in this rule', async () => {
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

    const result = await validateRuleDefaultExceptionList({
      ruleId: '1',
      ruleRuleId: undefined,
      exceptionsList: [defaultExceptionList],
      rulesClient: clients.rulesClient,
    });
    expect(result).toBeUndefined();
  });

  it('throw error if there rule default list in other rule', async () => {
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

    await expect(
      validateRuleDefaultExceptionList({
        ruleId: '1',
        ruleRuleId: undefined,
        exceptionsList: [defaultExceptionList],
        rulesClient: clients.rulesClient,
      })
    ).rejects.toThrow(
      'default exception list for rule: 1 already exists in rule(s): 04128c15-0d1b-4716-a4c5-46997ac7f3bd'
    );
  });

  it('throw error if there rule default list in other rule and ruleID undefined', async () => {
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

    await expect(
      validateRuleDefaultExceptionList({
        ruleId: undefined,
        ruleRuleId: undefined,
        exceptionsList: [defaultExceptionList],
        rulesClient: clients.rulesClient,
      })
    ).rejects.toThrow(
      'default exception list already exists in rule(s): 04128c15-0d1b-4716-a4c5-46997ac7f3bd'
    );
  });

  it('throw error if there rule default list in other rule and ruleID undefined but ruleRuleId defined', async () => {
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

    await expect(
      validateRuleDefaultExceptionList({
        ruleId: undefined,
        ruleRuleId: '2',
        exceptionsList: [defaultExceptionList],
        rulesClient: clients.rulesClient,
      })
    ).rejects.toThrow(
      'default exception list for rule: 2 already exists in rule(s): 04128c15-0d1b-4716-a4c5-46997ac7f3bd'
    );
  });
});
