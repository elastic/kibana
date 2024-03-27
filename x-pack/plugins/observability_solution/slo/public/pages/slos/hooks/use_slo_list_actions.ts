/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import { useCallback } from 'react';
import { useKibana } from '../../../utils/kibana_react';
import { useDeleteSlo } from '../../../hooks/use_delete_slo';
import { SLO_EMBEDDABLE } from '../../../embeddable/slo/overview/slo_embeddable';

export function useSloListActions({
  slo,
  setIsAddRuleFlyoutOpen,
  setIsActionsPopoverOpen,
  setDeleteConfirmationModalOpen,
  setDashboardAttachmentReady,
}: {
  slo: SLOWithSummaryResponse;
  setIsActionsPopoverOpen: (val: boolean) => void;
  setIsAddRuleFlyoutOpen: (val: boolean) => void;
  setDeleteConfirmationModalOpen: (val: boolean) => void;
  setDashboardAttachmentReady?: (val: boolean) => void;
}) {
  const { embeddable } = useKibana().services;
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

  const handleAttachToDashboardSave: SaveModalDashboardProps['onSave'] = useCallback(
    ({ dashboardId, newTitle, newDescription }) => {
      const stateTransfer = embeddable!.getStateTransfer();
      const embeddableInput = {
        title: newTitle,
        description: newDescription,
        sloId: slo.id,
        sloInstanceId: slo.instanceId,
      };

      const state = {
        input: embeddableInput,
        type: SLO_EMBEDDABLE,
      };

      const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

      stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
        state,
        path,
      });
    },
    [embeddable, slo.id, slo.instanceId]
  );

  return {
    handleDeleteConfirm,
    handleDeleteCancel,
    handleCreateRule,
    handleAttachToDashboardSave,
  };
}
