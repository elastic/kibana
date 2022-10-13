/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useCallback, useRef } from 'react';
import { useAsyncConfirmation } from '../rules_table/use_async_confirmation';

import type {
  BulkActionEditPayload,
  BulkActionEditType,
} from '../../../../../../common/detection_engine/schemas/request/perform_bulk_action_schema';
import { useBoolState } from '../../../../../common/hooks/use_bool_state';

export const useBulkEditFormFlyout = () => {
  const dataFormRef = useRef<BulkActionEditPayload | null>(null);
  const [actionType, setActionType] = useState<BulkActionEditType>();
  const [isBulkEditFlyoutVisible, showBulkEditFlyout, hideBulkEditFlyout] = useBoolState();

  const [confirmForm, onConfirm, onCancel] = useAsyncConfirmation({
    onInit: showBulkEditFlyout,
    onFinish: hideBulkEditFlyout,
  });

  const completeBulkEditForm = useCallback(
    async (editActionType: BulkActionEditType) => {
      setActionType(editActionType);
      if ((await confirmForm()) === true) {
        return dataFormRef.current;
      } else {
        return null;
      }
    },
    [confirmForm]
  );

  const handleBulkEditFormConfirm = useCallback(
    (data: BulkActionEditPayload) => {
      dataFormRef.current = data;
      onConfirm();
    },
    [onConfirm]
  );

  return {
    bulkEditActionType: actionType,
    isBulkEditFlyoutVisible,
    handleBulkEditFormConfirm,
    handleBulkEditFormCancel: onCancel,
    completeBulkEditForm,
  };
};
