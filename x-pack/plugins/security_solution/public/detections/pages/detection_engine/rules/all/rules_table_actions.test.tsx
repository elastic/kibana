/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';
import { useAppToastsMock } from '../../../../../common/hooks/use_app_toasts.mock';
import '../../../../../common/mock/match_media';
import { goToRuleEditPage, performTrackableBulkAction } from './actions';
import { getRulesTableActions } from './rules_table_actions';
import { mockRule } from './__mocks__/mock';

jest.mock('./actions');

const performTrackableBulkActionMock = performTrackableBulkAction as jest.Mock;
const goToRuleEditPageMock = goToRuleEditPage as jest.Mock;

describe('getRulesTableActions', () => {
  const rule = mockRule(uuid.v4());
  const toasts = useAppToastsMock.create();
  const invalidateRules = jest.fn();
  const invalidatePrePackagedRulesStatus = jest.fn();
  const setLoadingRules = jest.fn();
  const startTransaction = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('duplicate rule onClick should call rule edit after the rule is duplicated', async () => {
    const ruleDuplicate = mockRule('newRule');
    const navigateToApp = jest.fn();
    performTrackableBulkActionMock.mockImplementation(() =>
      Promise.resolve({ attributes: { results: { created: [ruleDuplicate] } } })
    );

    const duplicateRulesActionObject = getRulesTableActions({
      toasts,
      navigateToApp,
      invalidateRules,
      invalidatePrePackagedRulesStatus,
      actionsPrivileges: true,
      setLoadingRules,
      startTransaction,
    })[1];
    const duplicateRulesActionHandler = duplicateRulesActionObject.onClick;
    expect(duplicateRulesActionHandler).toBeDefined();

    await duplicateRulesActionHandler!(rule);

    expect(performTrackableBulkAction).toHaveBeenCalledWith('duplicate', [rule.id]);
    expect(goToRuleEditPageMock).toHaveBeenCalledWith(ruleDuplicate.id, navigateToApp);
  });

  test('delete rule onClick should call refetch after the rule is deleted', async () => {
    const navigateToApp = jest.fn();

    const deleteRulesActionObject = getRulesTableActions({
      toasts,
      navigateToApp,
      invalidateRules,
      invalidatePrePackagedRulesStatus,
      actionsPrivileges: true,
      setLoadingRules,
      startTransaction,
    })[3];
    const deleteRuleActionHandler = deleteRulesActionObject.onClick;
    expect(deleteRuleActionHandler).toBeDefined();

    await deleteRuleActionHandler!(rule);

    expect(performTrackableBulkAction).toHaveBeenCalledTimes(1);
    expect(performTrackableBulkAction).toHaveBeenCalledWith('delete', [rule.id]);
    expect(invalidateRules).toHaveBeenCalledTimes(1);
    expect(performTrackableBulkActionMock.mock.invocationCallOrder[0]).toBeLessThan(
      invalidateRules.mock.invocationCallOrder[0]
    );
  });
});
