/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HTTPError } from '../../../../../common/detection_engine/types';
import { BulkAction } from '../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';
import * as i18n from '../../../../detections/pages/detection_engine/rules/translations';
import type { BulkActionResponse, BulkActionSummary } from '../../api/api';

export function summarizeBulkSuccess(action: BulkAction): string {
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

export function explainBulkSuccess(action: BulkAction, summary: BulkActionSummary): string {
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

export function summarizeBulkError(action: BulkAction): string {
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

export function explainBulkError(action: BulkAction, error: HTTPError): string {
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

const getExportSuccessToastMessage = (succeeded: number, total: number) => {
  const message = [i18n.RULES_BULK_EXPORT_SUCCESS_DESCRIPTION(succeeded, total)];

  // if not all rules are successfully exported it means there included prebuilt rules
  // display message to users that prebuilt rules were excluded
  if (total > succeeded) {
    message.push(i18n.RULES_BULK_EXPORT_PREBUILT_RULES_EXCLUDED_DESCRIPTION);
  }

  return message.join(' ');
};
