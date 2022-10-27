/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkActionSummary } from '..';
import type { UseAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { BulkAction } from '../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';
import { explainBulkSuccess, summarizeBulkSuccess } from './translations';

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
