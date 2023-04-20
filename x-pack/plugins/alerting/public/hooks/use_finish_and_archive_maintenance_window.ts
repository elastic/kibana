/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@tanstack/react-query';

import { useKibana } from '../utils/kibana_react';
import { finishMaintenanceWindow } from '../services/maintenance_windows_api/finish';
import { archiveMaintenanceWindow } from '../services/maintenance_windows_api/archive';

export function useFinishAndArchiveMaintenanceWindow() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const mutationFn = (maintenanceWindowId: string) => {
    return Promise.all([
      finishMaintenanceWindow({ http, maintenanceWindowId }),
      archiveMaintenanceWindow({ http, maintenanceWindowId, archive: true }),
    ]).then(([, archivedMaintenanceWindow]) => archivedMaintenanceWindow);
  };

  return useMutation(mutationFn, {
    onSuccess: (data) => {
      toasts.addSuccess(
        i18n.translate('xpack.alerting.maintenanceWindowsFinishedAndArchiveSuccess', {
          defaultMessage: "Cancelled and archived running maintenance window '{title}'",
          values: {
            title: data.title,
          },
        })
      );
    },
    onError: (error, variables) => {
      toasts.addDanger(
        i18n.translate('xpack.alerting.maintenanceWindowsFinishedAndArchiveFailure', {
          defaultMessage: "Failed to cancel and archive maintenance window '{id}'",
          values: {
            id: variables,
          },
        })
      );
    },
  });
}
