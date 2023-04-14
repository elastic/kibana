/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useBoolState } from '../../../../../common/hooks/use_bool_state';
import { useAsyncConfirmation } from '../rules_table/use_async_confirmation';

/**
 * hook that controls bulk duplicate actions exceptions confirmation modal window and its content
 */
export const useBulkDuplicateExceptionsConfirmation = () => {
  const [isBulkDuplicateConfirmationVisible, showModal, hideModal] = useBoolState();
  const [initConfirmation, confirm, cancel] = useAsyncConfirmation<string>({
    onInit: showModal,
    onFinish: hideModal,
  });

  return {
    isBulkDuplicateConfirmationVisible,
    showBulkDuplicateConfirmation: initConfirmation,
    cancelRuleDuplication: cancel,
    confirmRuleDuplication: confirm,
  };
};
