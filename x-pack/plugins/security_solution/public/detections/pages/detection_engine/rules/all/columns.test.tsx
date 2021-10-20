/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid';

import type { DocLinksStart } from 'src/core/public';
import { scopedHistoryMock } from 'src/core/public/mocks';
import '../../../../../common/mock/match_media';
import { deleteRulesAction, duplicateRulesAction, editRuleAction } from './actions';
import { getActions, getColumns, getMonitoringColumns } from './columns';
import { mockRule } from './__mocks__/mock';

jest.mock('./actions', () => ({
  duplicateRulesAction: jest.fn(),
  deleteRulesAction: jest.fn(),
  editRuleAction: jest.fn(),
}));

const history = scopedHistoryMock.create();
const duplicateRulesActionMock = duplicateRulesAction as jest.Mock;
const deleteRulesActionMock = deleteRulesAction as jest.Mock;
const editRuleActionMock = editRuleAction as jest.Mock;

describe('AllRulesTable Columns', () => {
  const dispatch = jest.fn();
  const dispatchToaster = jest.fn();
  const reFetchRules = jest.fn();
  const refetchPrePackagedRulesStatus = jest.fn();
  const formatUrl = jest.fn();
  const navigateToApp = jest.fn();

  describe('getActions', () => {
    const rule = mockRule(uuid.v4());

    beforeEach(() => {
      duplicateRulesActionMock.mockClear();
      deleteRulesActionMock.mockClear();
      reFetchRules.mockClear();
    });

    test('duplicate rule onClick should call rule edit after the rule is duplicated', async () => {
      const ruleDuplicate = mockRule('newRule');
      duplicateRulesActionMock.mockImplementation(() => Promise.resolve([ruleDuplicate]));

      const duplicateRulesActionObject = getActions(
        dispatch,
        dispatchToaster,
        history,
        navigateToApp,
        reFetchRules,
        refetchPrePackagedRulesStatus,
        true
      )[1];
      await duplicateRulesActionObject.onClick(rule);
      expect(duplicateRulesActionMock).toHaveBeenCalled();
      expect(editRuleActionMock).toHaveBeenCalledWith(ruleDuplicate.id, navigateToApp);
    });

    test('delete rule onClick should call refetch after the rule is deleted', async () => {
      const deleteRulesActionObject = getActions(
        dispatch,
        dispatchToaster,
        history,
        navigateToApp,
        reFetchRules,
        refetchPrePackagedRulesStatus,
        true
      )[3];
      await deleteRulesActionObject.onClick(rule);
      expect(deleteRulesActionMock).toHaveBeenCalledTimes(1);
      expect(reFetchRules).toHaveBeenCalledTimes(1);
      expect(deleteRulesActionMock.mock.invocationCallOrder[0]).toBeLessThan(
        reFetchRules.mock.invocationCallOrder[0]
      );
    });
  });

  describe('getColumns', () => {
    test('should not have truncated text options for column items', () => {
      const columns = getColumns({
        dispatch,
        dispatchToaster,
        history,
        formatUrl,
        navigateToApp,
        reFetchRules,
        refetchPrePackagedRulesStatus,
        hasMlPermissions: false,
        hasPermissions: false,
        loadingRuleIds: [],
        hasReadActionsPrivileges: false,
      });

      columns.forEach((column) => {
        expect(column).not.toHaveProperty('truncateText');
      });
    });
  });

  describe('getMonitoringColumns', () => {
    test('should not have truncated text options for column items', () => {
      const docsLinksStartMock = { links: { siem: { troubleshootGaps: 'mock' } } } as DocLinksStart;
      const columns = getMonitoringColumns(navigateToApp, formatUrl, docsLinksStartMock);

      columns.forEach((column) => {
        expect(column).not.toHaveProperty('truncateText');
      });
    });
  });
});
