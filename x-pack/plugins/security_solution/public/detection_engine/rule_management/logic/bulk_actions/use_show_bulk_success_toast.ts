/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { BulkActionSummary } from '..';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { BulkActionType } from '../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';
import { explainBulkSuccess, summarizeBulkSuccess } from './translations';

export function useShowBulkSuccessToast() {
  const toasts = useAppToasts();

  return useCallback(
    (action: BulkActionType, summary: BulkActionSummary) => {
      toasts.addSuccess({
        title: summarizeBulkSuccess(action),
        text: explainBulkSuccess(action, summary),
      });
    },
    [toasts]
  );
}
