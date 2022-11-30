/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { List } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { validateRulesWithDuplicatedDefaultExceptionsList } from './validate_rules_with_duplicated_default_exceptions_list';

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

describe('validateRulesWithDuplicatedDefaultExceptionsList.test', () => {
  it('is valid array if there no rules', () => {
    const result = validateRulesWithDuplicatedDefaultExceptionsList({
      ruleId: undefined,
      exceptionsList: undefined,
      allRules: [],
    });
    expect(result).toBeUndefined();
  });

  it('is valid if there no default exceptions list duplicated', () => {
    const result = validateRulesWithDuplicatedDefaultExceptionsList({
      ruleId: undefined,
      exceptionsList: [defaultExceptionList],
      allRules: [
        {
          exceptions_list: [notDefaultExceptionList],
        },
        {
          exceptions_list: [defaultExceptionList],
        },
      ],
    });
    expect(result).toBeUndefined();
  });

  it('throw error if there the same default exceptions list', () => {
    expect(() =>
      validateRulesWithDuplicatedDefaultExceptionsList({
        ruleId: undefined,
        exceptionsList: [defaultExceptionList],
        allRules: [
          {
            exceptions_list: [defaultExceptionList],
          },
          {
            exceptions_list: [notDefaultExceptionList],
          },
          {
            exceptions_list: [defaultExceptionList],
          },
        ],
      })
    ).toThrow(`default exceptions list 2 is duplicated`);
  });

  it('throw error with ruleId if there the same default exceptions list', () => {
    expect(() =>
      validateRulesWithDuplicatedDefaultExceptionsList({
        ruleId: '1',
        exceptionsList: [defaultExceptionList],
        allRules: [
          {
            exceptions_list: [defaultExceptionList],
          },
          {
            exceptions_list: [notDefaultExceptionList],
          },
          {
            exceptions_list: [defaultExceptionList],
          },
        ],
      })
    ).toThrow(`default exceptions list 2 for rule 1 is duplicated`);
  });
});
