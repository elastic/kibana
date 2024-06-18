/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook } from '@testing-library/react-hooks';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useRulesTableContextOptional } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useBulkScheduleBackfill } from './use_bulk_schedule_backfill';
import { useBulkScheduleBackfillMutation } from '../../api/hooks/use_bulk_schedule_backfill_mutation';
import type { ScheduleBackfillBulkAction } from '../../api/api';

jest.mock('../../../../common/hooks/use_app_toasts');
jest.mock('../../../../common/lib/telemetry');
jest.mock('../../api/hooks/use_bulk_schedule_backfill_mutation');
jest.mock('../../../rule_management_ui/components/rules_table/rules_table/rules_table_context');

async function bulkScheduleBackfill(
  bulkAction: ScheduleBackfillBulkAction,
  options?: Parameters<typeof useBulkScheduleBackfill>[0]
): Promise<void> {
  const {
    result: {
      current: { bulkScheduleBackfill: bulkScheduleBackfillFn },
    },
  } = renderHook(() => useBulkScheduleBackfill(options));

  await bulkScheduleBackfillFn(bulkAction);
}

describe('useBulkScheduleBackfill', () => {
  let mutateAsync: jest.Mock;
  let toasts: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();

    mutateAsync = jest.fn().mockResolvedValue({
      attributes: {
        summary: {
          total: 2,
          succeeded: 2,
        },
      },
    });
    (useBulkScheduleBackfillMutation as jest.Mock).mockReturnValue({ mutateAsync });

    toasts = {
      addSuccess: jest.fn(),
      addError: jest.fn(),
    };
    (useAppToasts as jest.Mock).mockReturnValue(toasts);
  });

  it('executes bulk schedule backfill action', async () => {
    const bulkAction: ScheduleBackfillBulkAction = {
      type: BulkActionTypeEnum.backfill,
      query: 'some query',
      backfillPayload: { start_date: new Date().toISOString() },
    } as const;

    await bulkScheduleBackfill(bulkAction);

    expect(mutateAsync).toHaveBeenCalledWith({ bulkAction });
  });

  describe('state handlers', () => {
    it('shows success toast upon completion', async () => {
      await bulkScheduleBackfill({
        type: BulkActionTypeEnum.backfill,
        ids: ['ruleId1'],
        backfillPayload: { start_date: new Date().toISOString() },
      });

      expect(toasts.addSuccess).toHaveBeenCalled();
      expect(toasts.addError).not.toHaveBeenCalled();
    });

    it('does not shows success toast upon completion if suppressed', async () => {
      await bulkScheduleBackfill(
        {
          type: BulkActionTypeEnum.backfill,
          ids: ['ruleId1'],
          backfillPayload: { start_date: new Date().toISOString() },
        },
        { suppressSuccessToast: true }
      );

      expect(toasts.addSuccess).not.toHaveBeenCalled();
      expect(toasts.addError).not.toHaveBeenCalled();
    });

    it('shows error toast upon failure', async () => {
      (useBulkScheduleBackfillMutation as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn().mockRejectedValue(new Error()),
      });

      await bulkScheduleBackfill({
        type: BulkActionTypeEnum.backfill,
        ids: ['ruleId1'],
        backfillPayload: { start_date: new Date().toISOString() },
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
      await bulkScheduleBackfill({
        type: BulkActionTypeEnum.backfill,
        ids: ['ruleId1', 'ruleId2'],
        backfillPayload: { start_date: new Date().toISOString() },
      });

      expect(setLoadingRules).toHaveBeenCalledWith({
        ids: ['ruleId1', 'ruleId2'],
        action: BulkActionTypeEnum.backfill,
      });
    });

    it('sets the empty loading state before execution when query is set', async () => {
      await bulkScheduleBackfill({
        type: BulkActionTypeEnum.backfill,
        query: 'some query',
        backfillPayload: { start_date: new Date().toISOString() },
      });

      expect(setLoadingRules).toHaveBeenCalledWith({
        ids: [],
        action: BulkActionTypeEnum.backfill,
      });
    });

    it('clears loading state for the processing rules after execution', async () => {
      await bulkScheduleBackfill({
        type: BulkActionTypeEnum.backfill,
        ids: ['ruleId1', 'ruleId2'],
        backfillPayload: { start_date: new Date().toISOString() },
      });

      expect(setLoadingRules).toHaveBeenCalledWith({ ids: [], action: null });
    });

    it('clears loading state for the processing rules after execution failure', async () => {
      (useBulkScheduleBackfillMutation as jest.Mock).mockReturnValue({
        mutateAsync: jest.fn().mockRejectedValue(new Error()),
      });

      await bulkScheduleBackfill({
        type: BulkActionTypeEnum.backfill,
        ids: ['ruleId1', 'ruleId2'],
        backfillPayload: { start_date: new Date().toISOString() },
      });

      expect(setLoadingRules).toHaveBeenCalledWith({ ids: [], action: null });
    });
  });
});
