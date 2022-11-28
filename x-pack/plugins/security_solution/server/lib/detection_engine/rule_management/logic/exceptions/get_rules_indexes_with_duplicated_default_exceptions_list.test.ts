/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { List } from '@kbn/securitysolution-io-ts-list-types';
import { ExceptionListTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { getRulesIndexesWithDuplicatedDefaultExceptionsList } from './get_rules_indexes_with_duplicated_default_exceptions_list';

const notDefeaultExceptionList: List = {
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

describe('getRulesIndexesWithDuplicatedDefaultExceptionsList.test', () => {
  it('returns empty array if there no rules', () => {
    const result = getRulesIndexesWithDuplicatedDefaultExceptionsList([]);
    expect(result).toEqual([]);
  });

  it('returns empty array if there no default exceptions list duplicated', () => {
    const result = getRulesIndexesWithDuplicatedDefaultExceptionsList([
      {
        exceptions_list: [notDefeaultExceptionList],
      },
      {
        exceptions_list: [defaultExceptionList],
      },
    ]);
    expect(result).toEqual([]);
  });

  it('returns idexes of rules, which has the same deafult exceptions list', () => {
    const result = getRulesIndexesWithDuplicatedDefaultExceptionsList([
      {
        exceptions_list: [defaultExceptionList],
      },
      {
        exceptions_list: [notDefeaultExceptionList],
      },
      {
        exceptions_list: [defaultExceptionList],
      },
    ]);
    expect(result).toEqual([0, 2]);
  });
});
