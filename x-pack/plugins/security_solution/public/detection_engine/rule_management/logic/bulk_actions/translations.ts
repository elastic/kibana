/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ErrorToastOptions } from '@kbn/core-notifications-browser';
import { BulkAction } from '../../../../../common/detection_engine/rule_management';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';
import type { BulkActionSummary } from '../../api/api';

export function getErrorToastContent(
  action: BulkAction,
  summary: BulkActionSummary
): ErrorToastOptions {
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

  return { title, toastMessage };
}

export function getSuccessToastContent(action: BulkAction, summary: BulkActionSummary) {
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

  return { title, text };
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
