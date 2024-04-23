/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@tanstack/react-query';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import type { KibanaServerError } from '@kbn/kibana-utils-plugin/public';

import { useKibana } from '../utils/kibana_react';
import { createMaintenanceWindow, CreateParams } from '../services/maintenance_windows_api/create';

interface UseCreateMaintenanceWindowProps {
  onError?: (error: IHttpFetchError<KibanaServerError>) => void;
}

export function useCreateMaintenanceWindow(props?: UseCreateMaintenanceWindowProps) {
  const { onError } = props || {};

  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const mutationFn = (createParams: CreateParams) => {
    return createMaintenanceWindow({ http, createParams });
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
    onError: (error: IHttpFetchError<KibanaServerError>) => {
      toasts.addDanger(
        i18n.translate('xpack.alerting.maintenanceWindowsCreateFailure', {
          defaultMessage: 'Failed to create maintenance window.',
        })
      );
      onError?.(error);
    },
  });
}
