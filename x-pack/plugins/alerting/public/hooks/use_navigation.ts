/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { NavigateToAppOptions } from '@kbn/core/public';
import { useKibana } from '../utils/kibana_react';
import { paths } from '../config';
import { APP_ID, MAINTENANCE_WINDOWS_APP_ID } from '../config/paths';

export const AlertingDeepLinkId = {
  maintenanceWindows: 'maintenanceWindows',
} as const;

export type IAlertingDeepLinkId = typeof AlertingDeepLinkId[keyof typeof AlertingDeepLinkId];

type NavigateToAlerting = () => void;

export const useNavigateTo = (appId: string) => {
  const { navigateToApp } = useKibana().services.application;
  const navigateTo = useCallback(
    ({ ...options }: NavigateToAppOptions) => {
      navigateToApp(appId, options);
    },
    [appId, navigateToApp]
  );
  return { navigateTo };
};

export const useAlertingNavigation = ({
  path,
  deepLinkId,
}: {
  path: string;
  deepLinkId: IAlertingDeepLinkId;
}): NavigateToAlerting => {
  const { navigateTo } = useNavigateTo(APP_ID);
  const navigateToAlerting = useCallback<NavigateToAlerting>(
    () => navigateTo({ path, deepLinkId }),
    [navigateTo, deepLinkId, path]
  );
  return navigateToAlerting;
};

export const useCreateMaintenanceWindowNavigation = () => {
  const navigateToCreateMaintenanceWindow = useAlertingNavigation({
    path: paths.alerting.maintenanceWindowsCreate,
    deepLinkId: MAINTENANCE_WINDOWS_APP_ID,
  });
  return { navigateToCreateMaintenanceWindow };
};
