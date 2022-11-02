/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HTTPError } from '../../../../../common/detection_engine/types';
import type { UseAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { BulkActionType } from '../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';
import { explainBulkError, summarizeBulkError } from './translations';

export function showBulkErrorToast(
  toasts: UseAppToasts,
  action: BulkActionType,
  error: HTTPError
): void {
  toasts.addError(populateErrorStack(error), {
    title: summarizeBulkError(action),
    toastMessage: explainBulkError(action, error),
  });
}

function populateErrorStack(error: HTTPError): HTTPError {
  error.stack = JSON.stringify(error.body, null, 2);

  return error;
}
