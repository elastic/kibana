/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { BulkActionType } from '../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';
import type { UseAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { downloadBlob } from '../../../../common/utils/download_blob';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';
import { useRulesTableContextOptional } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { getExportedRulesCounts } from '../../../rule_management_ui/components/rules_table/helpers';
import { useBulkExportMutation } from '../../api/hooks/use_bulk_export_mutation';
import { showBulkErrorToast } from './show_bulk_error_toast';
import { showBulkSuccessToast } from './show_bulk_success_toast';
import type { QueryOrIds } from '../../api/api';
import { useGuessRuleIdsForBulkAction } from './use_guess_rule_ids_for_bulk_action';

export function useBulkExport() {
  const toasts = useAppToasts();
  const { mutateAsync } = useBulkExportMutation();
  const guessRuleIdsForBulkAction = useGuessRuleIdsForBulkAction();
  const rulesTableContext = useRulesTableContextOptional();
  const setLoadingRules = rulesTableContext?.actions.setLoadingRules;

  const bulkExport = useCallback(
    async (queryOrIds: QueryOrIds) => {
      try {
        setLoadingRules?.({
          ids: queryOrIds.ids ?? guessRuleIdsForBulkAction(BulkActionType.export),
          action: BulkActionType.export,
        });
        return await mutateAsync(queryOrIds);
      } catch (error) {
        showBulkErrorToast(toasts, BulkActionType.export, error);
      } finally {
        setLoadingRules?.({ ids: [], action: null });
      }
    },
    [guessRuleIdsForBulkAction, setLoadingRules, mutateAsync, toasts]
  );

  return { bulkExport };
}

/**
 * downloads exported rules, received from export action
 * @param params.response - Blob results with exported rules
 * @param params.toasts - {@link UseAppToasts} toasts service
 * @param params.onSuccess - {@link OnActionSuccessCallback} optional toast to display when action successful
 * @param params.onError - {@link OnActionErrorCallback} optional toast to display when action failed
 */
export async function downloadExportedRules({
  response,
  toasts,
}: {
  response: Blob;
  toasts: UseAppToasts;
}) {
  try {
    downloadBlob(response, `${i18n.EXPORT_FILENAME}.ndjson`);
    showBulkSuccessToast(toasts, BulkActionType.export, await getExportedRulesCounts(response));
  } catch (error) {
    showBulkErrorToast(toasts, BulkActionType.export, error);
  }
}
