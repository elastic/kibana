/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useState, useCallback } from 'react';
import { useAsyncConfirmation } from '../rules_table/use_async_confirmation';

import { useBoolState } from '../../../../../common/hooks/use_bool_state';

import type { DryRunResult, BulkActionForConfirmation } from './types';

/**
 * hook that controls bulk actions confirmation modal window and its content
 */
// TODO Why does this hook exist? Consider removing it altogether
export const useBulkActionsConfirmation = () => {
  const [bulkAction, setBulkAction] = useState<BulkActionForConfirmation>();
  const [dryRunResult, setDryRunResult] = useState<DryRunResult>();
  const [isBulkActionConfirmationVisible, showModal, hideModal] = useBoolState();

  const [confirmForm, onConfirm, onCancel] = useAsyncConfirmation({
    onInit: showModal,
    onFinish: hideModal,
  });

  const showBulkActionConfirmation = useCallback(
    async (result: DryRunResult | undefined, action: BulkActionForConfirmation) => {
      setBulkAction(action);
      setDryRunResult(result);

      // show bulk action confirmation window only if there is at least one failed rule, otherwise return early
      const hasFailedRules = (result?.failedRulesCount ?? 0) > 0;
      // TODO Why is this logic here? Extract it out of this hook.
      if (!hasFailedRules) {
        return true;
      }

      const confirmation = await confirmForm();
      if (confirmation) {
        onConfirm();
      }

      return confirmation;
    },
    [confirmForm, onConfirm]
  );

  return {
    bulkActionsDryRunResult: dryRunResult,
    bulkAction,
    isBulkActionConfirmationVisible,
    showBulkActionConfirmation,
    cancelBulkActionConfirmation: onCancel,
    approveBulkActionConfirmation: onConfirm,
  };
};
