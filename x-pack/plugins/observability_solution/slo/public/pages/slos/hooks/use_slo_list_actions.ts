/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SaveModalDashboardProps } from '@kbn/presentation-util-plugin/public';
import { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { useCallback } from 'react';
import { useKibana } from '../../../utils/kibana_react';
import { SLO_OVERVIEW_EMBEDDABLE_ID } from '../../../embeddable/slo/overview/constants';

export function useSloListActions({
  slo,
  setIsAddRuleFlyoutOpen,
  setIsActionsPopoverOpen,
}: {
  slo: SLOWithSummaryResponse;
  setIsActionsPopoverOpen: (val: boolean) => void;
  setIsAddRuleFlyoutOpen: (val: boolean) => void;
}) {
  const { embeddable } = useKibana().services;

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
        remoteName: slo.remote?.remoteName,
      };

      const state = {
        input: embeddableInput,
        type: SLO_OVERVIEW_EMBEDDABLE_ID,
      };

      const path = dashboardId === 'new' ? '#/create' : `#/view/${dashboardId}`;

      stateTransfer.navigateToWithEmbeddablePackage('dashboards', {
        state,
        path,
      });
    },
    [embeddable, slo.id, slo.instanceId, slo.remote?.remoteName]
  );

  return {
    handleCreateRule,
    handleAttachToDashboardSave,
  };
}
