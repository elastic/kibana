/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { getMutedAlerts } from '../apis/get_rules_muted_alerts';
import { useKibana } from '../../../../../common';
import { triggersActionsUiQueriesKeys } from '../../../../hooks/constants';
import { MutedAlerts, ServerError } from '../../types';
import { AlertsTableQueryContext } from '../../contexts/alerts_table_context';

const ERROR_TITLE = i18n.translate('xpack.triggersActionsUI.mutedAlerts.api.get', {
  defaultMessage: 'Error fetching muted alerts data',
});

export const useGetMutedAlerts = (ruleIds: string[], enabled = true) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  return useQuery(
    triggersActionsUiQueriesKeys.mutedAlerts(),
    ({ signal }) =>
      getMutedAlerts(http, { ids: ruleIds }, signal).then(({ data: rules }) =>
        rules?.reduce((mutedAlerts, rule) => {
          mutedAlerts[rule.id] = rule.muted_alert_ids;
          return mutedAlerts;
        }, {} as MutedAlerts)
      ),
    {
      context: AlertsTableQueryContext,
      enabled: ruleIds.length > 0 && enabled,
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
