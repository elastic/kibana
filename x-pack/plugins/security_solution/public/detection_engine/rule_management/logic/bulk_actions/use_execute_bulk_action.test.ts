/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { BulkActionType } from '../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../../common/lib/telemetry';
import { useBulkActionMutation } from '../../api/hooks/use_bulk_action_mutation';
import { useRulesTableContextOptional } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useExecuteBulkAction } from './use_execute_bulk_action';
import type { BulkAction } from '../../api/api';

jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../../../common/lib/telemetry');
jest.mock('../../api/hooks/use_bulk_action_mutation');
jest.mock('../../../rule_management_ui/components/rules_table/rules_table/rules_table_context');

async function executeBulkAction(
  bulkAction: BulkAction,
  options?: Parameters<typeof useExecuteBulkAction>[0]
): Promise<void> {
  const {
    result: {
      current: { executeBulkAction: executeBulkActionFn },
    },
  } = renderHook(() => useExecuteBulkAction(options));

  await executeBulkActionFn(bulkAction);
}

describe('useExecuteBulkAction', () => {
  let mutateAsync: jest.Mock;
  let toasts: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();

    mutateAsync = jest.fn().mockResolvedValue({
      attributes: {
        results: {
          updated: [{ immutable: true }, { immutable: false }],
        },
        summary: {
          total: 2,
          succeeded: 2,
        },
      },
    });
    (useBulkActionMutation as jest.Mock).mockReturnValue({ mutateAsync });

    toasts = {
      addSuccess: jest.fn(),
      addError: jest.fn(),
    };
    (useAppToasts as jest.Mock).mockReturnValue(toasts);
  });

  it('executes bulk action', async () => {
    const bulkAction = {
      type: BulkActionType.enable,
      query: 'some query',
    } as const;

    await executeBulkAction(bulkAction);

    expect(mutateAsync).toHaveBeenCalledWith({ bulkAction });
  });

  describe('state handlers', () => {
    it('shows success toast upon completion', async () => {
      await executeBulkAction({
        type: BulkActionType.enable,
        ids: ['ruleId1'],
      });

      expect(toasts.addSuccess).toHaveBeenCalled();
      expect(toasts.addError).not.toHaveBeenCalled();
    });

    it('does not shows success toast upon completion if suppressed', async () => {
      await executeBulkAction(
        {
          type: BulkActionType.enable,
          ids: ['ruleId1'],
        },
        { suppressSuccessToast: true }
      );

      expect(toasts.addSuccess).not.toHaveBeenCalled();
      expect(toasts.addError).not.toHaveBeenCalled();
    });

    it('shows error toast upon failure', async () => {
      (useBulkActionMutation as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn().mockRejectedValue(new Error()),
      });

      await executeBulkAction({
        type: BulkActionType.enable,
        ids: ['ruleId1'],
      });

      expect(toasts.addError).toHaveBeenCalled();
      expect(toasts.addSuccess).not.toHaveBeenCalled();
    });
  });

  describe('when rules table context is available', () => {
    let setLoadingRules: jest.Mock;

    beforeEach(() => {
      setLoadingRules = jest.fn();
      (useRulesTableContextOptional as jest.Mock).mockReturnValue({
        actions: {
          setLoadingRules,
        },
        state: {
          isAllSelected: false,
        },
      });
    });

    it('sets the loading state before execution', async () => {
      await executeBulkAction({
        type: BulkActionType.enable,
        ids: ['ruleId1', 'ruleId2'],
      });

      expect(setLoadingRules).toHaveBeenCalledWith({
        ids: ['ruleId1', 'ruleId2'],
        action: BulkActionType.enable,
      });
    });

    it('sets the empty loading state before execution when query is set', async () => {
      await executeBulkAction({
        type: BulkActionType.enable,
        query: 'some query',
      });

      expect(setLoadingRules).toHaveBeenCalledWith({
        ids: [],
        action: BulkActionType.enable,
      });
    });

    it('clears loading state for the processing rules after execution', async () => {
      await executeBulkAction({
        type: BulkActionType.enable,
        ids: ['ruleId1', 'ruleId2'],
      });

      expect(setLoadingRules).toHaveBeenCalledWith({ ids: [], action: null });
    });

    it('clears loading state for the processing rules after execution failure', async () => {
      (useBulkActionMutation as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn().mockRejectedValue(new Error()),
      });

      await executeBulkAction({
        type: BulkActionType.enable,
        ids: ['ruleId1', 'ruleId2'],
      });

      expect(setLoadingRules).toHaveBeenCalledWith({ ids: [], action: null });
    });
  });

  describe('telemetry', () => {
    it('sends for enable action', async () => {
      await executeBulkAction({
        type: BulkActionType.enable,
        query: 'some query',
      });

      expect(track).toHaveBeenCalledWith(METRIC_TYPE.COUNT, TELEMETRY_EVENT.SIEM_RULE_ENABLED);
      expect(track).toHaveBeenCalledWith(METRIC_TYPE.COUNT, TELEMETRY_EVENT.CUSTOM_RULE_ENABLED);
    });

    it('sends for disable action', async () => {
      await executeBulkAction({
        type: BulkActionType.disable,
        query: 'some query',
      });

      expect(track).toHaveBeenCalledWith(METRIC_TYPE.COUNT, TELEMETRY_EVENT.SIEM_RULE_DISABLED);
      expect(track).toHaveBeenCalledWith(METRIC_TYPE.COUNT, TELEMETRY_EVENT.CUSTOM_RULE_DISABLED);
    });
  });
});
