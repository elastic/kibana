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
import type { BulkActionType } from '../../../../../common/api/detection_engine/rule_management';
import { BulkActionTypeEnum } from '../../../../../common/api/detection_engine/rule_management';
import { SecurityPageName } from '../../../../app/types';
import { getEditRuleUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../../common/lib/telemetry';
import { useRulesTableContextOptional } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import type { BulkAction } from '../../api/api';
import { useBulkActionMutation } from '../../api/hooks/use_bulk_action_mutation';
import { useShowBulkErrorToast } from './use_show_bulk_error_toast';
import { useShowBulkSuccessToast } from './use_show_bulk_success_toast';
import { useGuessRuleIdsForBulkAction } from './use_guess_rule_ids_for_bulk_action';

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
  const { mutateAsync } = useBulkActionMutation();
  const showBulkSuccessToast = useShowBulkSuccessToast();
  const showBulkErrorToast = useShowBulkErrorToast();
  const guessRuleIdsForBulkAction = useGuessRuleIdsForBulkAction();
  const rulesTableContext = useRulesTableContextOptional();
  const setLoadingRules = rulesTableContext?.actions.setLoadingRules;

  const executeBulkAction = useCallback(
    async (bulkAction: BulkAction) => {
      try {
        setLoadingRules?.({
          ids: bulkAction.ids ?? guessRuleIdsForBulkAction(bulkAction.type),
          action: bulkAction.type,
        });

        const response = await mutateAsync({ bulkAction });
        sendTelemetry(bulkAction.type, response);

        if (!options?.suppressSuccessToast) {
          showBulkSuccessToast({
            actionType: bulkAction.type,
            summary: response.attributes.summary,
            editPayload:
              bulkAction.type === BulkActionTypeEnum.edit ? bulkAction.editPayload : undefined,
          });
        }

        return response;
      } catch (error) {
        showBulkErrorToast({ actionType: bulkAction.type, error });
      } finally {
        setLoadingRules?.({ ids: [], action: null });
      }
    },
    [
      options?.suppressSuccessToast,
      guessRuleIdsForBulkAction,
      setLoadingRules,
      mutateAsync,
      showBulkSuccessToast,
      showBulkErrorToast,
    ]
  );

  return { executeBulkAction };
};

function sendTelemetry(action: BulkActionType, response: BulkActionResponse): void {
  if (action !== BulkActionTypeEnum.disable && action !== BulkActionTypeEnum.enable) {
    return;
  }

  if (response.attributes.results.updated.some((rule) => rule.immutable)) {
    track(
      METRIC_TYPE.COUNT,
      action === BulkActionTypeEnum.enable
        ? TELEMETRY_EVENT.SIEM_RULE_ENABLED
        : TELEMETRY_EVENT.SIEM_RULE_DISABLED
    );
  }

  if (response.attributes.results.updated.some((rule) => !rule.immutable)) {
    track(
      METRIC_TYPE.COUNT,
      action === BulkActionTypeEnum.disable
        ? TELEMETRY_EVENT.CUSTOM_RULE_DISABLED
        : TELEMETRY_EVENT.CUSTOM_RULE_ENABLED
    );
  }
}
