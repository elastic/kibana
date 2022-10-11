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
import {
  performBulkAction,
  performBulkExportAction,
} from '../../../../containers/detection_engine/rules';
import * as i18n from '../translations';
import { getExportedRulesCounts } from './helpers';

export const goToRuleEditPage = (
  ruleId: string,
  navigateToApp: (appId: string, options?: NavigateToAppOptions | undefined) => Promise<void>
) => {
  navigateToApp(APP_UI_ID, {
    deepLinkId: SecurityPageName.rules,
    path: getEditRuleUrl(ruleId ?? ''),
  });
};

export async function performTrackableBulkAction(
  action: Exclude<BulkAction, BulkAction.export>,
  queryOrIds: string | string[],
  editPayload?: BulkActionEditPayload[],
  isDryRun = false
): Promise<BulkActionResponse> {
  const response = await performBulkAction(action, queryOrIds, editPayload, isDryRun);

  sendTelemetry(action, response);

  return response;
}

export function downloadRules(rulesBlob: Blob): void {
  downloadBlob(rulesBlob, `${i18n.EXPORT_FILENAME}.ndjson`);
}

/**
 * executes bulk export action and downloads exported rules
 * @param params - {@link ExportRulesBulkActionArgs}
 */
export async function bulkExportRules(
  queryOrIds: string | string[],
  toasts: UseAppToasts
): Promise<void> {
  try {
    const rulesBlob = await performBulkExportAction(queryOrIds);

    downloadRules(rulesBlob);

    showBulkSuccessToast(toasts, BulkAction.export, await getExportedRulesCounts(rulesBlob));
  } catch (e) {
    showBulkErrorToast(toasts, BulkAction.export, e);
  }
}

export function showBulkSuccessToast(
  toasts: UseAppToasts,
  action: BulkAction,
  summary: BulkActionSummary
): void {
  toasts.addSuccess({
    title: summarizeBulkSuccess(action),
    text: explainBulkSuccess(action, summary),
  });
}

export function showBulkErrorToast(
  toasts: UseAppToasts,
  action: BulkAction,
  error: HTTPError
): void {
  toasts.addError(populateErrorStack(error), {
    title: summarizeBulkError(action),
    toastMessage: explainBulkError(action, error),
  });
}

function summarizeBulkSuccess(action: BulkAction): string {
  switch (action) {
    case BulkAction.export:
      return i18n.RULES_BULK_EXPORT_SUCCESS;

    case BulkAction.duplicate:
      return i18n.RULES_BULK_DUPLICATE_SUCCESS;

    case BulkAction.delete:
      return i18n.RULES_BULK_DELETE_SUCCESS;

    case BulkAction.enable:
      return i18n.RULES_BULK_ENABLE_SUCCESS;

    case BulkAction.disable:
      return i18n.RULES_BULK_DISABLE_SUCCESS;

    case BulkAction.edit:
      return i18n.RULES_BULK_EDIT_SUCCESS;
  }
}

function getExportSuccessToastMessage(succeeded: number, total: number): string {
  const message = [i18n.RULES_BULK_EXPORT_SUCCESS_DESCRIPTION(succeeded, total)];

  // if not all rules are successfully exported it means there included prebuilt rules
  // display message to users that prebuilt rules were excluded
  if (total > succeeded) {
    message.push(i18n.RULES_BULK_EXPORT_PREBUILT_RULES_EXCLUDED_DESCRIPTION);
  }

  return message.join(' ');
}

function explainBulkSuccess(action: BulkAction, summary: BulkActionSummary): string {
  switch (action) {
    case BulkAction.export:
      return getExportSuccessToastMessage(summary.succeeded, summary.total);

    case BulkAction.duplicate:
      return i18n.RULES_BULK_DUPLICATE_SUCCESS_DESCRIPTION(summary.succeeded);

    case BulkAction.delete:
      return i18n.RULES_BULK_DELETE_SUCCESS_DESCRIPTION(summary.succeeded);

    case BulkAction.enable:
      return i18n.RULES_BULK_ENABLE_SUCCESS_DESCRIPTION(summary.succeeded);

    case BulkAction.disable:
      return i18n.RULES_BULK_DISABLE_SUCCESS_DESCRIPTION(summary.succeeded);

    case BulkAction.edit:
      return i18n.RULES_BULK_EDIT_SUCCESS_DESCRIPTION(summary.succeeded);
  }
}

function summarizeBulkError(action: BulkAction): string {
  switch (action) {
    case BulkAction.export:
      return i18n.RULES_BULK_EXPORT_FAILURE;

    case BulkAction.duplicate:
      return i18n.RULES_BULK_DUPLICATE_FAILURE;

    case BulkAction.delete:
      return i18n.RULES_BULK_DELETE_FAILURE;

    case BulkAction.enable:
      return i18n.RULES_BULK_ENABLE_FAILURE;

    case BulkAction.disable:
      return i18n.RULES_BULK_DISABLE_FAILURE;

    case BulkAction.edit:
      return i18n.RULES_BULK_EDIT_FAILURE;
  }
}

function explainBulkError(action: BulkAction, error: HTTPError): string {
  // if response doesn't have number of failed rules, it means the whole bulk action failed
  const summary = (error.body as BulkActionResponse)?.attributes?.summary;

  if (!summary) {
    return '';
  }

  switch (action) {
    case BulkAction.export:
      return i18n.RULES_BULK_EXPORT_FAILURE_DESCRIPTION(summary.failed);

    case BulkAction.duplicate:
      return i18n.RULES_BULK_DUPLICATE_FAILURE_DESCRIPTION(summary.failed);

    case BulkAction.delete:
      return i18n.RULES_BULK_DELETE_FAILURE_DESCRIPTION(summary.failed);

    case BulkAction.enable:
      return i18n.RULES_BULK_ENABLE_FAILURE_DESCRIPTION(summary.failed);

    case BulkAction.disable:
      return i18n.RULES_BULK_DISABLE_FAILURE_DESCRIPTION(summary.failed);

    case BulkAction.edit:
      return i18n.RULES_BULK_EDIT_FAILURE_DESCRIPTION(summary.failed);
  }
}

function populateErrorStack(error: HTTPError): HTTPError {
  error.stack = JSON.stringify(error.body, null, 2);

  return error;
}

function sendTelemetry(action: Omit<BulkAction, BulkAction.export>, response: BulkActionResponse) {
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
