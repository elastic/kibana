/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigateToAppOptions } from '@kbn/core/public';
import { useCallback } from 'react';
import type { BulkActionResponse, BulkActionSummary } from '..';
import { APP_UI_ID } from '../../../../../common/constants';
import type { BulkActionEditPayload } from '../../../../../common/detection_engine/rule_management';
import { BulkAction } from '../../../../../common/detection_engine/rule_management';
import type { HTTPError } from '../../../../../common/detection_engine/types';
import { SecurityPageName } from '../../../../app/types';
import { getEditRuleUrl } from '../../../../common/components/link_to/redirect_to_detection_engine';
import type { UseAppToasts } from '../../../../common/hooks/use_app_toasts';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../../common/lib/telemetry';
import type { RulesTableActions } from '../../../rule_management_ui/components/rules_table/rules_table/rules_table_context';
import { useBulkActionMutation } from '../../api/hooks/use_bulk_action_mutation';
import { getErrorToastContent, getSuccessToastContent } from './translations';

export const goToRuleEditPage = (
  ruleId: string,
  navigateToApp: (appId: string, options?: NavigateToAppOptions | undefined) => Promise<void>
) => {
  navigateToApp(APP_UI_ID, {
    deepLinkId: SecurityPageName.rules,
    path: getEditRuleUrl(ruleId ?? ''),
  });
};

type OnActionSuccessCallback = (
  toasts: UseAppToasts,
  action: BulkAction,
  summary: BulkActionSummary
) => void;

type OnActionErrorCallback = (toasts: UseAppToasts, action: BulkAction, error: HTTPError) => void;

interface RulesBulkActionArgs {
  action: Exclude<BulkAction, BulkAction.export>;
  visibleRuleIds?: string[];
  search: { query: string } | { ids: string[] };
  payload?: { edit?: BulkActionEditPayload[] };
  onError?: OnActionErrorCallback;
  onFinish?: () => void;
  onSuccess?: OnActionSuccessCallback;
  setLoadingRules?: RulesTableActions['setLoadingRules'];
}

export const useExecuteBulkAction = () => {
  const toasts = useAppToasts();
  const { mutateAsync } = useBulkActionMutation();

  const executeBulkAction = useCallback(
    async ({
      visibleRuleIds = [],
      action,
      setLoadingRules,
      search,
      payload,
      onSuccess = defaultSuccessHandler,
      onError = defaultErrorHandler,
      onFinish,
    }: RulesBulkActionArgs) => {
      try {
        setLoadingRules?.({ ids: visibleRuleIds, action });
        const response = await mutateAsync({ ...search, action, edit: payload?.edit });
        sendTelemetry(action, response);
        onSuccess(toasts, action, response.attributes.summary);

        return response;
      } catch (error) {
        onError(toasts, action, error);
      } finally {
        setLoadingRules?.({ ids: [], action: null });
        onFinish?.();
      }
    },
    [mutateAsync, toasts]
  );

  return { executeBulkAction };
};

function defaultErrorHandler(toasts: UseAppToasts, action: BulkAction, error: HTTPError) {
  const summary = (error?.body as BulkActionResponse)?.attributes?.summary;
  error.stack = JSON.stringify(error.body, null, 2);

  toasts.addError(error, getErrorToastContent(action, summary));
}

async function defaultSuccessHandler(
  toasts: UseAppToasts,
  action: BulkAction,
  summary: BulkActionSummary
) {
  toasts.addSuccess(getSuccessToastContent(action, summary));
}

function sendTelemetry(action: BulkAction, response: BulkActionResponse) {
  if (action === BulkAction.disable || action === BulkAction.enable) {
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
          ? TELEMETRY_EVENT.CUSTOM_RULE_ENABLED
          : TELEMETRY_EVENT.CUSTOM_RULE_DISABLED
      );
    }
  }
}
