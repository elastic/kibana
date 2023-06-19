/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';
import { CHANGE_CHECK_DEBOUNCE } from '@kbn/dashboard-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import {
  EDIT_DASHBOARD_BUTTON_TITLE,
  SAVE_DASHBOARD_BUTTON_TITLE,
} from '../pages/details/translations';

export const useDashboardActions = ({
  dashboardContainer,
}: {
  dashboardContainer?: DashboardAPI;
}) => {
  const [isSaveInProgress, setIsSaveInProgress] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.VIEW);
  // const hasUnsavedChanges =
  // dashboardContainer?.select((state) => state.componentState.hasUnsavedChanges) ?? false;
  // const hasOverlays = dashboardContainer?.select((state) => state.componentState.hasOverlays);

  // const disableButton = !hasUnsavedChanges || isSaveInProgress || hasOverlays;
  const iconType = viewMode === ViewMode.EDIT ? 'save' : 'pencil';
  const title =
    viewMode === ViewMode.EDIT ? SAVE_DASHBOARD_BUTTON_TITLE : EDIT_DASHBOARD_BUTTON_TITLE;
  const quickSaveDashboard = useCallback(
    ({ callback }: { callback?: () => void }) => {
      setIsSaveInProgress(true);
      dashboardContainer?.runQuickSave().then(() =>
        setTimeout(() => {
          setIsSaveInProgress(false);
          callback?.();
        }, CHANGE_CHECK_DEBOUNCE)
      );
    },
    [dashboardContainer]
  );

  const triggerViewMode = useCallback(() => {
    if (viewMode !== ViewMode.EDIT) {
      dashboardContainer?.dispatch.setViewMode(ViewMode.EDIT);
      dashboardContainer?.clearOverlays();
      setViewMode(ViewMode.EDIT);
    }
    if (viewMode === ViewMode.EDIT) {
      quickSaveDashboard({
        callback: () => {
          setViewMode(ViewMode.VIEW);
        },
      });
    }
  }, [dashboardContainer, quickSaveDashboard, viewMode]);

  return {
    triggerViewMode,
    isSaveInProgress,
    viewMode,
    // disabled: disableButton,
    iconType,
    title,
  };
};
