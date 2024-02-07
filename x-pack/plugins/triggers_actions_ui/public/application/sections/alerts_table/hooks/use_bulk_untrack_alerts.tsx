/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@tanstack/react-query';
import { INTERNAL_BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import { AlertsTableQueryContext } from '../contexts/alerts_table_context';
import { useKibana } from '../../../../common';

export const useBulkUntrackAlerts = () => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const untrackAlerts = useMutation<string, string, { indices: string[]; alertUuids: string[] }>(
    ['untrackAlerts'],
    ({ indices, alertUuids }) => {
      try {
        const body = JSON.stringify({
          ...(indices?.length ? { indices } : {}),
          ...(alertUuids ? { alert_uuids: alertUuids } : {}),
        });
        return http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/alerts/_bulk_untrack`, { body });
      } catch (e) {
        throw new Error(`Unable to parse bulk untrack params: ${e}`);
      }
    },
    {
      context: AlertsTableQueryContext,
      onError: (_err, params) => {
        toasts.addDanger(
          i18n.translate(
            'xpack.triggersActionsUI.rules.deleteConfirmationModal.errorNotification.descriptionText',
            {
              defaultMessage: 'Failed to untrack {uuidsCount, plural, one {alert} other {alerts}}',
              values: { uuidsCount: params.alertUuids.length },
            }
          )
        );
      },

      onSuccess: (_, params) => {
        toasts.addSuccess(
          i18n.translate(
            'xpack.triggersActionsUI.rules.deleteConfirmationModal.successNotification.descriptionText',
            {
              defaultMessage: 'Untracked {uuidsCount, plural, one {alert} other {alerts}}',
              values: { uuidsCount: params.alertUuids.length },
            }
          )
        );
      },
    }
  );

  return untrackAlerts;
};
