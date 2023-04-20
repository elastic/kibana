/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import type { MaintenanceWindow } from '@kbn/alerting-plugin/common/maintenance_window';
import { INTERNAL_BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import { KibanaServices } from '../../../../common/lib/kibana';
import * as i18n from './translations';

const GET_RUNNING_MAINTENANCE_WINDOWS_URL = `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window/_active`;

export const fetchRunningMaintenanceWindows = async (
  signal?: AbortSignal
): Promise<MaintenanceWindow[]> => {
  return KibanaServices.get().http.fetch(GET_RUNNING_MAINTENANCE_WINDOWS_URL, {
    method: 'GET',
    signal,
  });
};

export const useFetchRunningMaintenanceWindows = () => {
  const { addError } = useAppToasts();

  return useQuery(
    ['GET', GET_RUNNING_MAINTENANCE_WINDOWS_URL],
    ({ signal }) => fetchRunningMaintenanceWindows(signal),
    {
      refetchInterval: 60000,
      onError: (error) => {
        addError(error, { title: i18n.FETCH_ERROR, toastMessage: i18n.FETCH_ERROR_DESCRIPTION });
      },
    }
  );
};
