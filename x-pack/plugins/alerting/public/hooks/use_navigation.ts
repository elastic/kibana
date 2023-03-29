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
import { APP_ID, MAINTENANCE_WINDOWS_APP_ID } from '../../common';

export const AlertingDeepLinkId = {
  maintenanceWindows: 'maintenanceWindows',
  maintenanceWindowsCreate: 'create',
};

export type IAlertingDeepLinkId = typeof AlertingDeepLinkId[keyof typeof AlertingDeepLinkId];

type NavigateToAlerting = () => void;
type GetAlertingUrl = (absolute?: boolean) => string;

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

export const useAppUrl = (appId: string) => {
  const { getUrlForApp } = useKibana().services.application;

  const getAppUrl = useCallback(
    (options?: { deepLinkId?: string; path?: string; absolute?: boolean }) =>
      getUrlForApp(appId, options),
    [appId, getUrlForApp]
  );
  return { getAppUrl };
};

export const useNavigation = (appId: string) => {
  const { navigateTo } = useNavigateTo(appId);
  const { getAppUrl } = useAppUrl(appId);
  return { navigateTo, getAppUrl };
};

export const useAlertingNavigation = ({
  path,
  deepLinkId,
}: {
  path: string;
  deepLinkId: IAlertingDeepLinkId;
}): [NavigateToAlerting, GetAlertingUrl] => {
  const { navigateTo, getAppUrl } = useNavigation(APP_ID);
  const navigateToAlerting = useCallback<NavigateToAlerting>(
    () => navigateTo({ path, deepLinkId }),
    [navigateTo, deepLinkId, path]
  );
  const getAlertingUrl = useCallback<GetAlertingUrl>(
    (absolute) => getAppUrl({ path, deepLinkId, absolute }),
    [getAppUrl, deepLinkId, path]
  );
  return [navigateToAlerting, getAlertingUrl];
};

export const useCreateMaintenanceWindowNavigation = () => {
  const [navigateToCreateMaintenanceWindow] = useAlertingNavigation({
    path: paths.alerting.maintenanceWindowsCreate,
    deepLinkId: MAINTENANCE_WINDOWS_APP_ID,
  });
  return { navigateToCreateMaintenanceWindow };
};

export const useMaintenanceWindowsNavigation = () => {
  const [navigateToMaintenanceWindows, getMaintenanceWindowsUrl] = useAlertingNavigation({
    path: '/',
    deepLinkId: MAINTENANCE_WINDOWS_APP_ID,
  });
  return { navigateToMaintenanceWindows, getMaintenanceWindowsUrl };
};
