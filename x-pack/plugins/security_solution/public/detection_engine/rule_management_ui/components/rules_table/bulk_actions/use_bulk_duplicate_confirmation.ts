/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback } from 'react';
import { useAsyncCheckboxConfirmation } from '../rules_table/use_async_checkbox_confirm';

import { useBoolState } from '../../../../../../common/hooks/use_bool_state';

/**
 * hook that controls bulk duplicate actions exceptions confirmation modal window and its content
 */
export const useBulkDuplicateExceptionsConfirmation = () => {
  const [isBulkDuplicateConfirmationVisible, showModal, hideModal] = useBoolState();

  const [confirmForm, onConfirm, onCancel] = useAsyncCheckboxConfirmation({
    onInit: showModal,
    onFinish: hideModal,
  });

  const showBulkDuplicateConfirmation = useCallback(async () => {
    const confirmation = await confirmForm();
    if (confirmation) {
      onConfirm();
    }

    return confirmation;
  }, [confirmForm, onConfirm]);

  return {
    isBulkDuplicateConfirmationVisible,
    showBulkDuplicateConfirmation,
    cancelRuleDuplication: onCancel,
    confirmRuleDuplication: onConfirm,
  };
};
