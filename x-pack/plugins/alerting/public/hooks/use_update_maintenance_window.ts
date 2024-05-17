/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IHttpFetchError } from '@kbn/core-http-browser';
import { i18n } from '@kbn/i18n';
import type { KibanaServerError } from '@kbn/kibana-utils-plugin/public';
import { useMutation } from '@tanstack/react-query';
import type { MaintenanceWindow } from '../../common';

import { UpdateParams, updateMaintenanceWindow } from '../services/maintenance_windows_api/update';
import { useKibana } from '../utils/kibana_react';

interface UseUpdateMaintenanceWindowProps {
  onError?: (error: IHttpFetchError<KibanaServerError>) => void;
}

export function useUpdateMaintenanceWindow(props?: UseUpdateMaintenanceWindowProps) {
  const { onError } = props || {};

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const mutationFn = ({
    maintenanceWindowId,
    updateParams,
  }: {
    maintenanceWindowId: string;
    updateParams: UpdateParams;
  }) => {
    return updateMaintenanceWindow({ http, maintenanceWindowId, updateParams });
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
    onError: (error: IHttpFetchError<KibanaServerError>) => {
      toasts.addDanger(
        i18n.translate('xpack.alerting.maintenanceWindowsUpdateFailure', {
          defaultMessage: 'Failed to update maintenance window.',
        })
      );
      onError?.(error);
    },
  });
}
