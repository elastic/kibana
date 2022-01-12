/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useCallback, useRef } from 'react';
import { useAsyncConfirmation } from './use_async_confirmation';

import { BulkActionEditType } from '../../../../../../common/detection_engine/schemas/common/schemas';
import { useBoolState } from '../../../../../common/hooks/use_bool_state';

export const useBulkEditFlyout = () => {
  const dataFormRef = useRef<unknown>();
  const [actionType, setActionType] = useState<BulkActionEditType>();
  const [isBulkEditFlyoutVisible, showBulkEditFlyout, hideBulkEditFlyout] = useBoolState();

  const [confirmForm, onConfirm, onCancel] = useAsyncConfirmation({
    onInit: showBulkEditFlyout,
    onFinish: hideBulkEditFlyout,
  });

  const performBulkEdit = useCallback(
    async (editActionType: BulkActionEditType) => {
      setActionType(editActionType);
      if ((await confirmForm()) === true) {
        return dataFormRef.current;
      } else {
        throw Error('Form is cancelled');
      }
    },
    [confirmForm]
  );

  const handlePerformBulkEditConfirm = useCallback(
    <T>(data: T) => {
      dataFormRef.current = data;
      onConfirm();
    },
    [onConfirm]
  );

  return {
    performBulkEdit,
    bulkEditActionType: actionType,
    isBulkEditFlyoutVisible,
    handlePerformBulkEditConfirm,
    handlePerformBulkEditCancel: onCancel,
  };
};
