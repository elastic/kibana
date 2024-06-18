/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import { useRulesTableContextOptional } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useShowBulkErrorToast } from './use_show_bulk_error_toast';
import type { ScheduleBackfillBulkAction } from '../../api/api';
import { useGuessRuleIdsForBulkAction } from './use_guess_rule_ids_for_bulk_action';
import { useBulkScheduleBackfillMutation } from '../../api/hooks/use_bulk_schedule_backfill_mutation';
import { useShowBulkSuccessToast } from './use_show_bulk_success_toast';

interface UseBulkScheduleBackfillActionOptions {
  suppressSuccessToast?: boolean;
}

export function useBulkScheduleBackfill(options?: UseBulkScheduleBackfillActionOptions) {
  const { mutateAsync } = useBulkScheduleBackfillMutation();
  const showBulkSuccessToast = useShowBulkSuccessToast();
  const showBulkErrorToast = useShowBulkErrorToast();
  const guessRuleIdsForBulkAction = useGuessRuleIdsForBulkAction();
  const rulesTableContext = useRulesTableContextOptional();
  const setLoadingRules = rulesTableContext?.actions.setLoadingRules;

  const bulkScheduleBackfill = useCallback(
    async (bulkAction: ScheduleBackfillBulkAction) => {
      try {
        setLoadingRules?.({
          ids: bulkAction.ids ?? guessRuleIdsForBulkAction(BulkActionTypeEnum.backfill),
          action: BulkActionTypeEnum.backfill,
        });

        const response = await mutateAsync({ bulkAction });

        if (!options?.suppressSuccessToast) {
          showBulkSuccessToast({
            actionType: bulkAction.type,
            summary: response.attributes.summary,
          });
        }

        return response;
      } catch (error) {
        showBulkErrorToast({ actionType: BulkActionTypeEnum.backfill, error });
      } finally {
        setLoadingRules?.({ ids: [], action: null });
      }
    },
    [
      setLoadingRules,
      guessRuleIdsForBulkAction,
      mutateAsync,
      options?.suppressSuccessToast,
      showBulkSuccessToast,
      showBulkErrorToast,
    ]
  );

  return { bulkScheduleBackfill };
}
