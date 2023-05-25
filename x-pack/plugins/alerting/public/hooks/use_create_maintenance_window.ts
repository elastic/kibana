/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@tanstack/react-query';

import { useKibana } from '../utils/kibana_react';
import { MaintenanceWindow } from '../pages/maintenance_windows/types';
import { createMaintenanceWindow } from '../services/maintenance_windows_api/create';

export function useCreateMaintenanceWindow() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const mutationFn = (maintenanceWindow: MaintenanceWindow) => {
    return createMaintenanceWindow({ http, maintenanceWindow });
  };

  return useMutation(mutationFn, {
    onSuccess: (data) => {
      toasts.addSuccess(
        i18n.translate('xpack.alerting.maintenanceWindowsCreateSuccess', {
          defaultMessage: "Created maintenance window '{title}'",
          values: {
            title: data.title,
          },
        })
      );
    },
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.alerting.maintenanceWindowsCreateFailure', {
          defaultMessage: 'Failed to create maintenance window.',
        })
      );
    },
  });
}
