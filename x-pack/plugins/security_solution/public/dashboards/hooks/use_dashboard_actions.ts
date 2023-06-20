/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { DashboardAPI } from '@kbn/dashboard-plugin/public';
import { CHANGE_CHECK_DEBOUNCE } from '@kbn/dashboard-plugin/public';
import { ViewMode } from '@kbn/embeddable-plugin/public';
import { batch } from 'react-redux';
import {
  EDIT_DASHBOARD_BUTTON_TITLE,
  SAVE_DASHBOARD_BUTTON_TITLE,
  VIEW_DASHBOARD_BUTTON_TITLE,
} from '../pages/details/translations';

interface QuickSaveDashboardParams {
  callback?: () => void;
}

type QuickSaveDashboard = (params?: QuickSaveDashboardParams) => void;

export const useDashboardActions = ({
  dashboardContainer,
  initialViewMode,
}: {
  dashboardContainer?: DashboardAPI;
  initialViewMode: ViewMode;
}) => {
  const [isSaveInProgress, setIsSaveInProgress] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  // const hasUnsavedChanges =
  //   dashboardContainer?.select((state) => state.componentState.hasUnsavedChanges) ?? false;
  // const hasOverlays = dashboardContainer?.select((state) => state.componentState.hasOverlays);

  // const disableButton = !hasUnsavedChanges || isSaveInProgress || hasOverlays;

  const quickSaveDashboard = useCallback<QuickSaveDashboard>(
    (params) => {
      setIsSaveInProgress(true);
      dashboardContainer?.runQuickSave().then(() =>
        setTimeout(() => {
          setIsSaveInProgress(false);
          params?.callback?.();
        }, CHANGE_CHECK_DEBOUNCE)
      );
    },
    [dashboardContainer]
  );

  const triggerViewMode = useCallback(
    ({ saveDashboard }: { saveDashboard: boolean }) => {
      if (viewMode !== ViewMode.EDIT) {
        dashboardContainer?.dispatch.setViewMode(ViewMode.EDIT);
        dashboardContainer?.clearOverlays();
        setViewMode(ViewMode.EDIT);
      }
      if (viewMode === ViewMode.EDIT) {
        if (saveDashboard === true) {
          quickSaveDashboard({
            callback: () => {
              setViewMode(ViewMode.VIEW);
              dashboardContainer?.dispatch.setViewMode(ViewMode.VIEW);
            },
          });
        } else {
          setViewMode(ViewMode.VIEW);
          dashboardContainer?.dispatch.setViewMode(ViewMode.VIEW);
        }
      }
    },
    [dashboardContainer, quickSaveDashboard, viewMode]
  );

  const resetChanges = useCallback(() => {
    dashboardContainer?.clearOverlays();

    batch(() => {
      dashboardContainer?.resetToLastSavedState();
    });
  }, [dashboardContainer]);

  const editAction = useMemo(
    () => ({
      id: 'editAction',
      action: () => {
        triggerViewMode({ saveDashboard: false });
      },
      isSaveInProgress,
      iconType: 'pencil',
      title: EDIT_DASHBOARD_BUTTON_TITLE,
      buttonType: 'fill' as const,
    }),
    [isSaveInProgress, triggerViewMode]
  );

  const quickSaveAction = useMemo(
    () => ({
      id: 'quickSaveAction',
      action: () => {
        triggerViewMode({ saveDashboard: true });
      },
      isSaveInProgress,
      iconType: 'save',
      title: SAVE_DASHBOARD_BUTTON_TITLE,
      buttonType: 'fill' as const,
    }),
    [isSaveInProgress, triggerViewMode]
  );

  const resetChangesAction = useMemo(
    () => ({
      id: 'resetChangesAction',
      action: resetChanges,
      isSaveInProgress,
      title: 'Reset',
    }),
    [isSaveInProgress, resetChanges]
  );

  const switchToViewModeAction = useMemo(
    () => ({
      id: 'switchToViewModeAction',
      action: () => {
        triggerViewMode({ saveDashboard: false });
      },
      isSaveInProgress,
      title: VIEW_DASHBOARD_BUTTON_TITLE,
    }),
    [isSaveInProgress, triggerViewMode]
  );

  const editModeActions = useMemo(
    () => [switchToViewModeAction, resetChangesAction, quickSaveAction],
    [switchToViewModeAction, quickSaveAction, resetChangesAction]
  );
  const viewModeActions = useMemo(() => [editAction], [editAction]);
  const result = useMemo(
    () => ({
      actions: viewMode === ViewMode.EDIT ? editModeActions : viewModeActions,
      viewMode,
    }),
    [editModeActions, viewMode, viewModeActions]
  );

  return result;
};
