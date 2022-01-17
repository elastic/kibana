/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { DashboardItem } from './use_dashboards_table';
import { useMlKibana } from '../../contexts/kibana';
import { useDashboardService } from '../../services/dashboard_service';
import { DashboardConstants } from '../../../../../../../src/plugins/dashboard/public';
import {
  ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
  AnomalySwimlaneEmbeddableInput,
} from '../../../embeddables';

export const useAddToDashboardActions = (
  getEmbeddableInput: () => {
    type: typeof ANOMALY_SWIMLANE_EMBEDDABLE_TYPE;
    input: Partial<AnomalySwimlaneEmbeddableInput>;
  }
) => {
  const {
    services: { embeddable },
  } = useMlKibana();
  const dashboardService = useDashboardService();

  const addToDashboardAndEditCallback = useCallback(
    async (selectedDashboard: DashboardItem) => {
      const stateTransfer = embeddable.getStateTransfer();
      const selectedDashboardId = selectedDashboard.id;

      const dashboardPath = await dashboardService.getDashboardEditUrl(selectedDashboardId);

      await stateTransfer.navigateToWithEmbeddablePackage(DashboardConstants.DASHBOARDS_ID, {
        path: dashboardPath,
        state: getEmbeddableInput(),
      });
    },
    [getEmbeddableInput]
  );

  return { addToDashboardAndEditCallback };
};
