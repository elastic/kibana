/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigateToAppOptions } from '@kbn/core/public';
import { APP_UI_ID } from '../../../../../../common/constants';
import {
  BulkAction,
  BulkActionEditPayload,
} from '../../../../../../common/detection_engine/schemas/common/schemas';
import { HTTPError } from '../../../../../../common/detection_engine/types';
import { SecurityPageName } from '../../../../../app/types';
import { getEditRuleUrl } from '../../../../../common/components/link_to/redirect_to_detection_engine';
import type { UseAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../../../common/lib/telemetry';
import { downloadBlob } from '../../../../../common/utils/download_blob';
import {
  BulkActionResponse,
  BulkActionSummary,
  performBulkAction,
} from '../../../../containers/detection_engine/rules';
import * as i18n from '../translations';
import { getExportedRulesCounts } from './helpers';
import { RulesTableActions } from './rules_table/rules_table_context';

export const goToRuleEditPage = (
  ruleId: string,
  navigateToApp: (appId: string, options?: NavigateToAppOptions | undefined) => Promise<void>
) => {
  navigateToApp(APP_UI_ID, {
    deepLinkId: SecurityPageName.rules,
    path: getEditRuleUrl(ruleId ?? ''),
  });
};

interface ExecuteRulesBulkActionArgs {
  visibleRuleIds?: string[];
  action: BulkAction;
  toasts: UseAppToasts;
  search: { query: string } | { ids: string[] };
  payload?: { edit?: BulkActionEditPayload[] };
  onSuccess?: (toasts: UseAppToasts, action: BulkAction, summary: BulkActionSummary) => void;
  onError?: (toasts: UseAppToasts, action: BulkAction, error: HTTPError) => void;
  onFinish?: () => void;
  setLoadingRules?: RulesTableActions['setLoadingRules'];
}

export const executeRulesBulkAction = async ({
  visibleRuleIds = [],
  action,
  setLoadingRules,
  toasts,
  search,
  payload,
  onSuccess = defaultSuccessHandler,
  onError = defaultErrorHandler,
  onFinish,
}: ExecuteRulesBulkActionArgs) => {
  try {
    setLoadingRules?.({ ids: visibleRuleIds, action });

    if (action === BulkAction.export) {
      const response = await performBulkAction({ ...search, action });
      downloadBlob(response, `${i18n.EXPORT_FILENAME}.ndjson`);
      onSuccess(toasts, action, await getExportedRulesCounts(response));
    } else {
      const response = await performBulkAction({ ...search, action, edit: payload?.edit });
      sendTelemetry(action, response);
      onSuccess(toasts, action, response.attributes.summary);

      return response;
    }
  } catch (error) {
    onError(toasts, action, error);
  } finally {
    setLoadingRules?.({ ids: [], action: null });
    onFinish?.();
  }
};

function defaultErrorHandler(toasts: UseAppToasts, action: BulkAction, error: HTTPError) {
  // if response doesn't have number of failed rules, it means the whole bulk action failed
  // and general error toast will be shown. Otherwise - error toast for partial failure
  const summary = (error?.body as BulkActionResponse)?.attributes?.summary;
  error.stack = JSON.stringify(error.body, null, 2);

  let title: string;
  let toastMessage: string | undefined;

  switch (action) {
    case BulkAction.export:
      title = i18n.RULES_BULK_EXPORT_FAILURE;
      if (summary) {
        toastMessage = i18n.RULES_BULK_EXPORT_FAILURE_DESCRIPTION(summary.failed);
      }
      break;
    case BulkAction.duplicate:
      title = i18n.RULES_BULK_DUPLICATE_FAILURE;
      if (summary) {
        toastMessage = i18n.RULES_BULK_DUPLICATE_FAILURE_DESCRIPTION(summary.failed);
      }
      break;
    case BulkAction.delete:
      title = i18n.RULES_BULK_DELETE_FAILURE;
      if (summary) {
        toastMessage = i18n.RULES_BULK_DELETE_FAILURE_DESCRIPTION(summary.failed);
      }
      break;
    case BulkAction.enable:
      title = i18n.RULES_BULK_ENABLE_FAILURE;
      if (summary) {
        toastMessage = i18n.RULES_BULK_ENABLE_FAILURE_DESCRIPTION(summary.failed);
      }
      break;
    case BulkAction.disable:
      title = i18n.RULES_BULK_DISABLE_FAILURE;
      if (summary) {
        toastMessage = i18n.RULES_BULK_DISABLE_FAILURE_DESCRIPTION(summary.failed);
      }
      break;
    case BulkAction.edit:
      title = i18n.RULES_BULK_EDIT_FAILURE;
      if (summary) {
        toastMessage = i18n.RULES_BULK_EDIT_FAILURE_DESCRIPTION(summary.failed);
      }
      break;
  }

  toasts.addError(error, { title, toastMessage });
}

async function defaultSuccessHandler(
  toasts: UseAppToasts,
  action: BulkAction,
  summary: BulkActionSummary
) {
  let title: string;
  let text: string | undefined;

  switch (action) {
    case BulkAction.export:
      title = i18n.RULES_BULK_EXPORT_SUCCESS;
      text = i18n.RULES_BULK_EXPORT_SUCCESS_DESCRIPTION(summary.succeeded, summary.total);
      break;
    case BulkAction.duplicate:
      title = i18n.RULES_BULK_DUPLICATE_SUCCESS;
      text = i18n.RULES_BULK_DUPLICATE_SUCCESS_DESCRIPTION(summary.succeeded);
      break;
    case BulkAction.delete:
      title = i18n.RULES_BULK_DELETE_SUCCESS;
      text = i18n.RULES_BULK_DELETE_SUCCESS_DESCRIPTION(summary.succeeded);
      break;
    case BulkAction.enable:
      title = i18n.RULES_BULK_ENABLE_SUCCESS;
      text = i18n.RULES_BULK_ENABLE_SUCCESS_DESCRIPTION(summary.succeeded);
      break;
    case BulkAction.disable:
      title = i18n.RULES_BULK_DISABLE_SUCCESS;
      text = i18n.RULES_BULK_DISABLE_SUCCESS_DESCRIPTION(summary.succeeded);
      break;
    case BulkAction.edit:
      title = i18n.RULES_BULK_EDIT_SUCCESS;
      text = i18n.RULES_BULK_EDIT_SUCCESS_DESCRIPTION(summary.succeeded);
      break;
  }

  toasts.addSuccess({ title, text });
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
