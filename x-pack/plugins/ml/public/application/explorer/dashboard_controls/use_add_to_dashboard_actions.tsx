/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { DashboardItem } from './use_dashboards_table';
import { SavedDashboardPanel } from '../../../../../../../src/plugins/dashboard/common/types';
import { useMlKibana } from '../../contexts/kibana';
import { useDashboardService } from '../../services/dashboard_service';

export const useAddToDashboardActions = ({
  onClose,
  getPanelsData,
  selectedDashboards,
}: {
  onClose: (callback?: () => Promise<void>) => void;
  getPanelsData: (
    selectedDashboards: DashboardItem[]
  ) => Promise<Array<Pick<SavedDashboardPanel, 'title' | 'type' | 'embeddableConfig'>>>;
  selectedDashboards: DashboardItem[];
}) => {
  const {
    notifications: { toasts },
    services: {
      application: { navigateToUrl },
    },
  } = useMlKibana();
  const dashboardService = useDashboardService();

  const addToDashboardCallback = useCallback(async () => {
    const panelsData = await getPanelsData(selectedDashboards);
    for (const selectedDashboard of selectedDashboards) {
      try {
        await dashboardService.attachPanels(
          selectedDashboard.id,
          selectedDashboard.attributes,
          panelsData
        );
        toasts.success({
          title: (
            <FormattedMessage
              id="xpack.ml.explorer.dashboardsTable.savedSuccessfullyTitle"
              defaultMessage='Dashboard "{dashboardTitle}" updated successfully'
              values={{ dashboardTitle: selectedDashboard.title }}
            />
          ),
          toastLifeTimeMs: 3000,
        });
      } catch (e) {
        toasts.danger({
          body: e,
        });
      }
    }
  }, [selectedDashboards, getPanelsData]);

  const addToDashboardAndEditCallback = useCallback(async () => {
    onClose(async () => {
      await addToDashboardCallback();
      const selectedDashboardId = selectedDashboards[0].id;
      await navigateToUrl(await dashboardService.getDashboardEditUrl(selectedDashboardId));
    });
  }, [addToDashboardCallback, selectedDashboards, navigateToUrl]);

  return { addToDashboardCallback, addToDashboardAndEditCallback };
};
