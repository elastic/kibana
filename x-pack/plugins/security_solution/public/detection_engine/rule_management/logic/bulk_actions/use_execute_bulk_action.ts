/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigateToAppOptions } from '@kbn/core/public';
import { useCallback } from 'react';
import type { BulkActionResponse } from '..';
import { APP_UI_ID } from '../../../../../common/constants';
import { BulkActionType } from '../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';
import { SecurityPageName } from '../../../../app/types';
import { getEditRuleUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../../common/lib/telemetry';
import { useRulesTableContextOptional } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import type { BulkAction } from '../../api/api';
import { useBulkActionMutation } from '../../api/hooks/use_bulk_action_mutation';
import { showBulkErrorToast } from './show_bulk_error_toast';
import { showBulkSuccessToast } from './show_bulk_success_toast';
import { useAllRuleIdsForBulkAction } from './useAllRuleIdsForBulkAction';

export const goToRuleEditPage = (
  ruleId: string,
  navigateToApp: (appId: string, options?: NavigateToAppOptions | undefined) => Promise<void>
) => {
  navigateToApp(APP_UI_ID, {
    deepLinkId: SecurityPageName.rules,
    path: getEditRuleUrl(ruleId ?? ''),
  });
};

interface UseExecuteBulkActionOptions {
  suppressSuccessToast?: boolean;
}

export const useExecuteBulkAction = (options?: UseExecuteBulkActionOptions) => {
  const toasts = useAppToasts();
  const { mutateAsync } = useBulkActionMutation();
  const getAllRuleIdsForBulkAction = useAllRuleIdsForBulkAction();
  const rulesTableContext = useRulesTableContextOptional();
  const setLoadingRules = rulesTableContext?.actions.setLoadingRules;

  const executeBulkAction = useCallback(
    async (bulkAction: BulkAction) => {
      try {
        setLoadingRules?.({
          ids: bulkAction.ids ?? getAllRuleIdsForBulkAction(bulkAction.type),
          action: bulkAction.type,
        });

        const response = await mutateAsync(bulkAction);
        sendTelemetry(bulkAction.type, response);

        if (!options?.suppressSuccessToast) {
          showBulkSuccessToast(toasts, bulkAction.type, response.attributes.summary);
        }

        return response;
      } catch (error) {
        showBulkErrorToast(toasts, bulkAction.type, error);
      } finally {
        setLoadingRules?.({ ids: [], action: null });
      }
    },
    [
      options?.suppressSuccessToast,
      getAllRuleIdsForBulkAction,
      setLoadingRules,
      mutateAsync,
      toasts,
    ]
  );

  return { executeBulkAction };
};

function sendTelemetry(action: BulkActionType, response: BulkActionResponse): void {
  if (action !== BulkActionType.disable && action !== BulkActionType.enable) {
    return;
  }

  if (response.attributes.results.updated.some((rule) => rule.immutable)) {
    track(
      METRIC_TYPE.COUNT,
      action === BulkActionType.enable
        ? TELEMETRY_EVENT.SIEM_RULE_ENABLED
        : TELEMETRY_EVENT.SIEM_RULE_DISABLED
    );
  }

  if (response.attributes.results.updated.some((rule) => !rule.immutable)) {
    track(
      METRIC_TYPE.COUNT,
      action === BulkActionType.disable
        ? TELEMETRY_EVENT.CUSTOM_RULE_DISABLED
        : TELEMETRY_EVENT.CUSTOM_RULE_ENABLED
    );
  }
}
