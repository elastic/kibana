/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { AlertsTableQueryContext } from '../../contexts/alerts_table_context';
import { muteAlertInstance } from '../../../../lib/rule_api/mute_alert';
import { useKibana } from '../../../../..';
import { ServerError, ToggleAlertParams } from '../../types';

const ERROR_TITLE = i18n.translate('xpack.triggersActionsUI.muteAlert.error', {
  defaultMessage: 'Error muting alert',
});

export const useMuteAlert = () => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  return useMutation(
    ({ ruleId, alertInstanceId }: ToggleAlertParams) =>
      muteAlertInstance({ http, id: ruleId, instanceId: alertInstanceId }),
    {
      context: AlertsTableQueryContext,
      onSuccess() {
        toasts.addSuccess(
          i18n.translate('xpack.triggersActionsUI.alertsTable.alertMuted', {
            defaultMessage: 'Alert muted',
          })
        );
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
