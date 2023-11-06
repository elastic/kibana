/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { ServerError, ToggleAlertParams } from '../types';
import { unmuteAlertInstance } from '../../../lib/rule_api/unmute_alert';
import { triggersActionsUiQueriesKeys } from '../../../hooks/constants';
import { useKibana } from '../../../..';

const ERROR_TITLE = i18n.translate('xpack.triggersActionsUI.unmuteAlert.error', {
  defaultMessage: 'Error unmuting alert',
});

export const useUnmuteAlert = () => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  const queryClient = useQueryClient();
  return useMutation(
    ({ ruleId, alertInstanceId }: ToggleAlertParams) =>
      unmuteAlertInstance({ http, id: ruleId, instanceId: alertInstanceId }),
    {
      onSuccess() {
        toasts.addSuccess(
          i18n.translate('xpack.triggersActionsUI.alertsTable.alertUnuted', {
            defaultMessage: 'Alert unmuted',
          })
        );
        return queryClient.invalidateQueries(triggersActionsUiQueriesKeys.getMutedAlerts());
      },
      onError: (error: ServerError) => {
        if (error.name !== 'AbortError') {
          toasts.addError(
            error.body && error.body.message ? new Error(error.body.message) : error,
            {
              title: ERROR_TITLE,
            }
          );
        }
      },
    }
  );
};
