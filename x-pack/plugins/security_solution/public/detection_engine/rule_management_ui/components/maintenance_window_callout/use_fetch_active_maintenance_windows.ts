/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@tanstack/react-query';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import * as i18n from './translations';
import { fetchActiveMaintenanceWindows } from './api';
import { GET_ACTIVE_MAINTENANCE_WINDOWS_URL } from './constants';

export const useFetchActiveMaintenanceWindows = () => {
  const { addError } = useAppToasts();

  return useQuery(
    ['GET', GET_ACTIVE_MAINTENANCE_WINDOWS_URL],
    ({ signal }) => fetchActiveMaintenanceWindows(signal),
    {
      refetchInterval: 60000,
      onError: (error) => {
        addError(error, { title: i18n.FETCH_ERROR, toastMessage: i18n.FETCH_ERROR_DESCRIPTION });
      },
    }
  );
};
