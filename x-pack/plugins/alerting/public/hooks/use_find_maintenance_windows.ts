/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '../utils/kibana_react';
import { findMaintenanceWindows } from '../services/maintenance_windows_api/find';

export const useFindMaintenanceWindows = () => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const queryFn = () => {
    return findMaintenanceWindows({ http });
  };

  const onErrorFn = (error: Error) => {
    if (error) {
      toasts.addDanger(
        i18n.translate('xpack.alerting.maintenanceWindowsListFailure', {
          defaultMessage: 'Unable to load maintenance windows.',
        })
      );
    }
  };

  const { isLoading, data = [] } = useQuery({
    queryKey: ['findMaintenanceWindows'],
    queryFn,
    onError: onErrorFn,
    refetchOnWindowFocus: false,
    retry: false,
    cacheTime: 0,
  });

  return {
    maintenanceWindows: data,
    isLoading,
  };
};
