/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { BulkActionSummary } from '..';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { BulkActionEditPayload } from '../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';
import { BulkActionType } from '../../../../../common/detection_engine/rule_management/api/rules/bulk_actions/request_schema';
import { explainBulkEditSuccess, explainBulkSuccess, summarizeBulkSuccess } from './translations';

interface ShowBulkSuccessToastProps {
  actionType: BulkActionType;
  summary: BulkActionSummary;
  editPayload?: BulkActionEditPayload[];
}

export function useShowBulkSuccessToast() {
  const toasts = useAppToasts();

  return useCallback(
    ({ actionType, summary, editPayload }: ShowBulkSuccessToastProps) => {
      const text =
        actionType === BulkActionType.edit
          ? explainBulkEditSuccess(editPayload ?? [], summary)
          : explainBulkSuccess(actionType, summary);

      toasts.addSuccess({
        title: summarizeBulkSuccess(actionType),
        text,
      });
    },
    [toasts]
  );
}
