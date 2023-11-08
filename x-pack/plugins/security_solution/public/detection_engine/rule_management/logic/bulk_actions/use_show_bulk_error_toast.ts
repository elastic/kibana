/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { HTTPError } from '../../../../../common/detection_engine/types';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import type { BulkActionType } from '../../../../../common/api/detection_engine/rule_management';
import { explainBulkError, summarizeBulkError } from './translations';

interface ShowBulkErrorToastProps {
  actionType: BulkActionType;
  error: HTTPError;
}

export function useShowBulkErrorToast() {
  const toasts = useAppToasts();

  return useCallback(
    ({ actionType, error }: ShowBulkErrorToastProps) => {
      toasts.addError(populateErrorStack(error), {
        title: summarizeBulkError(actionType),
        toastMessage: explainBulkError(actionType, error),
      });
    },
    [toasts]
  );
}

function populateErrorStack(error: HTTPError): HTTPError {
  error.stack = JSON.stringify(error.body, null, 2);

  return error;
}
