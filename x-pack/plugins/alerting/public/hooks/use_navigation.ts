/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { generatePath } from 'react-router-dom';
import type { NavigateToAppOptions } from '@kbn/core/public';
import { useKibana } from '../utils/kibana_react';
import {
  MAINTENANCE_WINDOW_PATHS,
  MANAGEMENT_APP_ID,
  MAINTENANCE_WINDOWS_APP_ID,
} from '../../common';

export const useNavigation = (appId: string) => {
  const { navigateToApp, getUrlForApp } = useKibana().services.application;

  const navigateTo = useCallback(
    (options: NavigateToAppOptions) => {
      navigateToApp(appId, options);
    },
    [appId, navigateToApp]
  );
  const getAppUrl = useCallback(
    (options?: { deepLinkId?: string; path?: string; absolute?: boolean }) =>
      getUrlForApp(appId, options),
    [appId, getUrlForApp]
  );
  return { navigateTo, getAppUrl };
};

export const useCreateMaintenanceWindowNavigation = () => {
  const { navigateTo } = useNavigation(MANAGEMENT_APP_ID);
  return {
    navigateToCreateMaintenanceWindow: () =>
      navigateTo({
        path: MAINTENANCE_WINDOW_PATHS.alerting.maintenanceWindowsCreate,
        deepLinkId: MAINTENANCE_WINDOWS_APP_ID,
      }),
  };
};

export const useMaintenanceWindowsNavigation = () => {
  const { navigateTo, getAppUrl } = useNavigation(MANAGEMENT_APP_ID);
  const path = '/';
  const deepLinkId = MAINTENANCE_WINDOWS_APP_ID;

  return {
    navigateToMaintenanceWindows: () => navigateTo({ path, deepLinkId }),
    getMaintenanceWindowsUrl: (absolute?: boolean) =>
      getAppUrl({
        path,
        deepLinkId,
        absolute,
      }),
  };
};

export const useEditMaintenanceWindowsNavigation = () => {
  const { navigateTo, getAppUrl } = useNavigation(MANAGEMENT_APP_ID);
  const deepLinkId = MAINTENANCE_WINDOWS_APP_ID;

  return {
    navigateToEditMaintenanceWindows: (maintenanceWindowId: string) =>
      navigateTo({
        path: generatePath(MAINTENANCE_WINDOW_PATHS.alerting.maintenanceWindowsEdit, {
          maintenanceWindowId,
        }),
        deepLinkId,
      }),
    getEditMaintenanceWindowsUrl: (maintenanceWindowId: string, absolute?: boolean) =>
      getAppUrl({
        path: generatePath(MAINTENANCE_WINDOW_PATHS.alerting.maintenanceWindowsEdit, {
          maintenanceWindowId,
        }),
        deepLinkId,
        absolute,
      }),
  };
};
