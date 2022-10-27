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
import { BulkAction } from '../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';
import { SecurityPageName } from '../../../../app/types';
import { getEditRuleUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../../common/lib/telemetry';
import { useRulesTableContextOptional } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import type { BulkActionDescriptor } from '../../api/api';
import { useBulkActionMutation } from '../../api/hooks/use_bulk_action_mutation';
import { showBulkErrorToast } from './show_bulk_error_toast';
import { showBulkSuccessToast } from './show_bulk_success_toast';

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
  const rulesTableContext = useRulesTableContextOptional();
  const setLoadingRules = rulesTableContext?.actions.setLoadingRules;

  const executeBulkAction = useCallback(
    async (bulkActionDescriptor: BulkActionDescriptor) => {
      try {
        setLoadingRules?.({
          ids: Array.isArray(bulkActionDescriptor.queryOrIds)
            ? bulkActionDescriptor.queryOrIds
            : [],
          action: bulkActionDescriptor.type,
        });

        const response = await mutateAsync(bulkActionDescriptor);
        sendTelemetry(bulkActionDescriptor.type, response);

        if (!options?.suppressSuccessToast) {
          showBulkSuccessToast(toasts, bulkActionDescriptor.type, response.attributes.summary);
        }

        return response;
      } catch (error) {
        showBulkErrorToast(toasts, bulkActionDescriptor.type, error);
      } finally {
        setLoadingRules?.({ ids: [], action: null });
      }
    },
    [options?.suppressSuccessToast, setLoadingRules, mutateAsync, toasts]
  );

  return { executeBulkAction };
};

function sendTelemetry(action: BulkAction, response: BulkActionResponse): void {
  if (action !== BulkAction.disable && action !== BulkAction.enable) {
    return;
  }

  if (response.attributes.results.updated.some((rule) => rule.immutable)) {
    track(
      METRIC_TYPE.COUNT,
      action === BulkAction.enable
        ? TELEMETRY_EVENT.SIEM_RULE_ENABLED
        : TELEMETRY_EVENT.SIEM_RULE_DISABLED
    );
  }

  if (response.attributes.results.updated.some((rule) => !rule.immutable)) {
    track(
      METRIC_TYPE.COUNT,
      action === BulkAction.disable
        ? TELEMETRY_EVENT.CUSTOM_RULE_DISABLED
        : TELEMETRY_EVENT.CUSTOM_RULE_ENABLED
    );
  }
}
