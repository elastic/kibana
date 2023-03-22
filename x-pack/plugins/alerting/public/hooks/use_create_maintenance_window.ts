/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@tanstack/react-query';
import { AsApiContract, RewriteRequestCase, RewriteResponseCase } from '@kbn/actions-plugin/common';

import { useKibana } from '../utils/kibana_react';
import { MaintenanceWindow } from '../pages/maintenance_windows/types';
import { INTERNAL_BASE_ALERTING_API_PATH } from '../../common';

const rewriteBodyRequest: RewriteResponseCase<MaintenanceWindow> = ({ rRule, ...res }) => ({
  ...res,
  r_rule: { ...rRule },
});

const rewriteBodyRes: RewriteRequestCase<MaintenanceWindow> = ({ r_rule: rRule, ...rest }) => ({
  ...rest,
  rRule: { ...rRule },
});

export function useCreateMaintenanceWindow() {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const createMaintenanceWindow = useMutation(
    async (maintenanceWindow: MaintenanceWindow) => {
      const res = await http.post<AsApiContract<MaintenanceWindow>>(
        `${INTERNAL_BASE_ALERTING_API_PATH}/rules/maintenance_window`,
        { body: JSON.stringify(rewriteBodyRequest(maintenanceWindow)) }
      );

      return rewriteBodyRes(res);
    },
    {
      onSuccess: (variables) => {
        toasts.addSuccess(
          i18n.translate('xpack.alerting.maintenanceWindowsCreateSuccess', {
            defaultMessage: "Created maintenance window'{title}'",
            values: {
              title: variables.title,
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
    }
  );

  return createMaintenanceWindow;
}
