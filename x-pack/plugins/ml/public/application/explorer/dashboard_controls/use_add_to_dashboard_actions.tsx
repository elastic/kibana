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
import { PLUGIN_ID } from '../../../../common/constants/app';
import { ANOMALY_SWIMLANE_EMBEDDABLE_TYPE } from '../../../embeddables';

export const useAddToDashboardActions = () => {
  const {
    services: { embeddable },
  } = useMlKibana();
  const dashboardService = useDashboardService();

  const addToDashboardAndEditCallback = useCallback(async (selectedDashboard: DashboardItem) => {
    const stateTransfer = embeddable.getStateTransfer();
    const selectedDashboardId = selectedDashboard.id;

    const dashboardPath = await dashboardService.getDashboardEditUrl(selectedDashboardId);

    await stateTransfer.navigateToEditor(DashboardConstants.DASHBOARDS_ID, {
      path: dashboardPath,
      state: {
        originatingApp: PLUGIN_ID,
        embeddableId: ANOMALY_SWIMLANE_EMBEDDABLE_TYPE,
        originatingPath: '',
        // valueInput: {},
      },
    });
  }, []);

  return { addToDashboardAndEditCallback };
};
