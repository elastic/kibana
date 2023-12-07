/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useDeleteSlo } from '../../../hooks/slo/use_delete_slo';

export function useSloListActions({
  slo,
  setIsAddRuleFlyoutOpen,
  setIsActionsPopoverOpen,
  setDeleteConfirmationModalOpen,
}: {
  slo: SLOWithSummaryResponse;
  setIsActionsPopoverOpen: (val: boolean) => void;
  setIsAddRuleFlyoutOpen: (val: boolean) => void;
  setDeleteConfirmationModalOpen: (val: boolean) => void;
}) {
  const { mutate: deleteSlo } = useDeleteSlo();

  const handleDeleteConfirm = () => {
    setDeleteConfirmationModalOpen(false);
    deleteSlo({ id: slo.id, name: slo.name });
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmationModalOpen(false);
  };
  const handleCreateRule = () => {
    setIsActionsPopoverOpen(false);
    setIsAddRuleFlyoutOpen(true);
  };

  return {
    handleDeleteConfirm,
    handleDeleteCancel,
    handleCreateRule,
  };
}
