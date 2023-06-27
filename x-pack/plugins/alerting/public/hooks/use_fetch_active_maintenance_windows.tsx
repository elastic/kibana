/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseQueryOptions } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import type { MaintenanceWindow } from '../../common/maintenance_window';
import { INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH } from '../../common';
import { useKibana } from '../utils/kibana_react';

export const useFetchActiveMaintenanceWindows = ({ enabled }: Pick<UseQueryOptions, 'enabled'>) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const fetchActiveMaintenanceWindows = async (
    signal?: AbortSignal
  ): Promise<MaintenanceWindow[]> =>
    http.fetch(INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH, {
      method: 'GET',
      signal,
    });

  return useQuery(
    ['GET', INTERNAL_ALERTING_API_GET_ACTIVE_MAINTENANCE_WINDOWS_PATH],
    ({ signal }) => fetchActiveMaintenanceWindows(signal),
    {
      enabled,
      refetchInterval: 60000,
      onError: (error: Error) => {
        toasts.addError(error, { title: FETCH_ERROR, toastMessage: FETCH_ERROR_DESCRIPTION });
      },
    }
  );
};

export const FETCH_ERROR = i18n.translate('xpack.alerting.maintenanceWindowCallout.fetchError', {
  defaultMessage: 'Failed to check if maintenance windows are active',
});

export const FETCH_ERROR_DESCRIPTION = i18n.translate(
  'xpack.alerting.maintenanceWindowCallout.fetchErrorDescription',
  {
    defaultMessage: 'Rule notifications are stopped while the maintenance window is running.',
  }
);
