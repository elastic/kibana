/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation } from '@tanstack/react-query';
import { i18n } from '@kbn/i18n';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { ServerError, ToggleAlertParams } from '../../types';
import { unmuteAlertInstance } from '../../../../lib/rule_api/unmute_alert';
import { useKibana } from '../../../../..';

const ERROR_TITLE = i18n.translate('xpack.triggersActionsUI.unmuteAlert.error', {
  defaultMessage: 'Error unmuting alert',
});

export const useUnmuteAlert = () => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  return useMutation(
    ({ ruleId, alertInstanceId }: ToggleAlertParams) =>
      unmuteAlertInstance({ http, id: ruleId, instanceId: alertInstanceId }),
    {
      context: AlertsQueryContext,
      onSuccess() {
        toasts.addSuccess(
          i18n.translate('xpack.triggersActionsUI.alertsTable.alertUnuted', {
            defaultMessage: 'Alert unmuted',
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
