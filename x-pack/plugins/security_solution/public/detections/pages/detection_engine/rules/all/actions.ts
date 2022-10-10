/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NavigateToAppOptions } from '@kbn/core/public';
import { APP_UI_ID } from '../../../../../../common/constants';
import type { BulkActionEditPayload } from '../../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import { BulkAction } from '../../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import type { HTTPError } from '../../../../../../common/detection_engine/types';
import { SecurityPageName } from '../../../../../app/types';
import { getEditRuleUrl } from '../../../../../common/components/link_to/redirect_to_detection_engine';
import type { UseAppToasts } from '../../../../../common/hooks/use_app_toasts';
import { METRIC_TYPE, TELEMETRY_EVENT, track } from '../../../../../common/lib/telemetry';
import { downloadBlob } from '../../../../../common/utils/download_blob';
import type {
  BulkActionSummary,
  BulkActionResponse,
} from '../../../../containers/detection_engine/rules';
import { performBulkAction } from '../../../../containers/detection_engine/rules';
import * as i18n from '../translations';
import { getExportedRulesCounts } from './helpers';
import type { RulesTableActions } from './rules_table/rules_table_context';

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

interface BaseRulesBulkActionArgs {
  visibleRuleIds?: string[];
  toasts: UseAppToasts;
  search: { query: string } | { ids: string[] };
  payload?: { edit?: BulkActionEditPayload[] };
  onError?: OnActionErrorCallback;
  onFinish?: () => void;
  onSuccess?: OnActionSuccessCallback;
  setLoadingRules?: RulesTableActions['setLoadingRules'];
}

interface RulesBulkActionArgs extends BaseRulesBulkActionArgs {
  action: Exclude<BulkAction, BulkAction.export>;
}
interface ExportRulesBulkActionArgs extends BaseRulesBulkActionArgs {
  action: BulkAction.export;
}

// export bulk actions API returns blob, the rest of actions returns BulkActionResponse object
// hence method overloading to make type safe calls
export async function executeRulesBulkAction(args: ExportRulesBulkActionArgs): Promise<Blob | null>;
export async function executeRulesBulkAction(
  args: RulesBulkActionArgs
): Promise<BulkActionResponse | null>;
export async function executeRulesBulkAction({
  visibleRuleIds = [],
  action,
  setLoadingRules,
  toasts,
  search,
  payload,
  onSuccess = defaultSuccessHandler,
  onError = defaultErrorHandler,
  onFinish,
}: RulesBulkActionArgs | ExportRulesBulkActionArgs) {
  let response: Blob | BulkActionResponse | null = null;
  try {
    setLoadingRules?.({ ids: visibleRuleIds, action });

    if (action === BulkAction.export) {
      // on successToast for export handles separately outside of action execution method
      response = await performBulkAction({ ...search, action });
    } else {
      response = await performBulkAction({ ...search, action, edit: payload?.edit });
      sendTelemetry(action, response);
      onSuccess(toasts, action, response.attributes.summary);
    }
  } catch (error) {
    onError(toasts, action, error);
  } finally {
    setLoadingRules?.({ ids: [], action: null });
    onFinish?.();
  }
  return response;
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
  onSuccess = defaultSuccessHandler,
  onError = defaultErrorHandler,
}: {
  response: Blob;
  toasts: UseAppToasts;
  onSuccess?: OnActionSuccessCallback;
  onError?: OnActionErrorCallback;
}) {
  try {
    downloadBlob(response, `${i18n.EXPORT_FILENAME}.ndjson`);
    onSuccess(toasts, BulkAction.export, await getExportedRulesCounts(response));
  } catch (error) {
    onError(toasts, BulkAction.export, error);
  }
}

/**
 * executes bulk export action and downloads exported rules
 * @param params - {@link ExportRulesBulkActionArgs}
 */
export async function bulkExportRules(params: ExportRulesBulkActionArgs) {
  const response = await executeRulesBulkAction(params);

  // if response null, likely network error happened and export rules haven't been received
  if (response) {
    await downloadExportedRules({ response, toasts: params.toasts, onSuccess: params.onSuccess });
  }
}

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

const getExportSuccessToastMessage = (succeeded: number, total: number) => {
  const message = [i18n.RULES_BULK_EXPORT_SUCCESS_DESCRIPTION(succeeded, total)];

  // if not all rules are successfully exported it means there included prebuilt rules
  // display message to users that prebuilt rules were excluded
  if (total > succeeded) {
    message.push(i18n.RULES_BULK_EXPORT_PREBUILT_RULES_EXCLUDED_DESCRIPTION);
  }

  return message.join(' ');
};

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
      text = getExportSuccessToastMessage(summary.succeeded, summary.total);
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
