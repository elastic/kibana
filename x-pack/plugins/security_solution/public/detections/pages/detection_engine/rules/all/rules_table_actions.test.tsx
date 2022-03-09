/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import '../../../../../common/mock/match_media';
import { deleteRulesAction, duplicateRulesAction, editRuleAction } from './actions';
import { getRulesTableActions } from './rules_table_actions';
import { mockRule } from './__mocks__/mock';

jest.mock('./actions', () => ({
  duplicateRulesAction: jest.fn(),
  deleteRulesAction: jest.fn(),
  editRuleAction: jest.fn(),
}));

const duplicateRulesActionMock = duplicateRulesAction as jest.Mock;
const deleteRulesActionMock = deleteRulesAction as jest.Mock;
const editRuleActionMock = editRuleAction as jest.Mock;

describe('getRulesTableActions', () => {
  const rule = mockRule(uuid.v4());
  const dispatchToaster = jest.fn();
  const reFetchRules = jest.fn();
  const setLoadingRules = jest.fn();

  beforeEach(() => {
    duplicateRulesActionMock.mockClear();
    deleteRulesActionMock.mockClear();
    reFetchRules.mockClear();
  });

  test('duplicate rule onClick should call rule edit after the rule is duplicated', async () => {
    const ruleDuplicate = mockRule('newRule');
    const navigateToApp = jest.fn();
    duplicateRulesActionMock.mockImplementation(() => Promise.resolve([ruleDuplicate]));

    const duplicateRulesActionObject = getRulesTableActions(
      dispatchToaster,
      navigateToApp,
      reFetchRules,
      true,
      setLoadingRules
    )[1];
    const duplicateRulesActionHandler = duplicateRulesActionObject.onClick;
    expect(duplicateRulesActionHandler).toBeDefined();

    await duplicateRulesActionHandler!(rule);
    expect(duplicateRulesActionMock).toHaveBeenCalled();
    expect(editRuleActionMock).toHaveBeenCalledWith(ruleDuplicate.id, navigateToApp);
  });

  test('delete rule onClick should call refetch after the rule is deleted', async () => {
    const navigateToApp = jest.fn();

    const deleteRulesActionObject = getRulesTableActions(
      dispatchToaster,
      navigateToApp,
      reFetchRules,
      true,
      setLoadingRules
    )[3];
    const deleteRuleActionHandler = deleteRulesActionObject.onClick;
    expect(deleteRuleActionHandler).toBeDefined();

    await deleteRuleActionHandler!(rule);
    expect(deleteRulesActionMock).toHaveBeenCalledTimes(1);
    expect(reFetchRules).toHaveBeenCalledTimes(1);
    expect(deleteRulesActionMock.mock.invocationCallOrder[0]).toBeLessThan(
      reFetchRules.mock.invocationCallOrder[0]
    );
  });
});
