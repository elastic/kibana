/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid';
import { createMemoryHistory } from 'history';

const history = createMemoryHistory();

import { mockRule } from './__mocks__/mock';
import { getActions } from './columns';

jest.mock('./actions', () => ({
  duplicateRulesAction: jest.fn(),
  deleteRulesAction: jest.fn(),
}));

import { duplicateRulesAction, deleteRulesAction } from './actions';

describe('AllRulesTable Columns', () => {
  describe('getActions', () => {
    const rule = mockRule(uuid.v4());
    let results: string[] = [];
    const dispatch = jest.fn();
    const dispatchToaster = jest.fn();
    const reFetchRules = jest.fn();

    beforeEach(() => {
      results = [];

      reFetchRules.mockImplementation(() => {
        results.push('reFetchRules');
        Promise.resolve();
      });
    });

    test('duplicate rule onClick should call refetch after the rule is duplicated', async () => {
      (duplicateRulesAction as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => {
              results.push('duplicateRulesAction');
              resolve();
            }, 500)
          )
      );

      const duplicateRulesActionObject = getActions(
        dispatch,
        dispatchToaster,
        history,
        reFetchRules
      )[1];
      await duplicateRulesActionObject.onClick(rule);
      expect(results).toEqual(['duplicateRulesAction', 'reFetchRules']);
    });

    test('delete rule onClick should call refetch after the rule is deleted', async () => {
      (deleteRulesAction as jest.Mock).mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(() => {
              results.push('deleteRulesAction');
              resolve();
            }, 500)
          )
      );

      const deleteRulesActionObject = getActions(
        dispatch,
        dispatchToaster,
        history,
        reFetchRules
      )[3];
      await deleteRulesActionObject.onClick(rule);
      expect(results).toEqual(['deleteRulesAction', 'reFetchRules']);
    });
  });
});
