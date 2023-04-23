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
import { updateMaintenanceWindow } from '../services/maintenance_windows_api/update';

export function useUpdateMaintenanceWindow() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const mutationFn = ({
    maintenanceWindowId,
    maintenanceWindow,
  }: {
    maintenanceWindowId: string;
    maintenanceWindow: MaintenanceWindow;
  }) => {
    return updateMaintenanceWindow({ http, maintenanceWindowId, maintenanceWindow });
  };

  return useMutation(mutationFn, {
    onSuccess: (variables: MaintenanceWindow) => {
      toasts.addSuccess(
        i18n.translate('xpack.alerting.maintenanceWindowsUpdateSuccess', {
          defaultMessage: "Updated maintenance window '{title}'",
          values: {
            title: variables.title,
          },
        })
      );
    },
    onError: () => {
      toasts.addDanger(
        i18n.translate('xpack.alerting.maintenanceWindowsUpdateFailure', {
          defaultMessage: 'Failed to update maintenance window.',
        })
      );
    },
  });
}
