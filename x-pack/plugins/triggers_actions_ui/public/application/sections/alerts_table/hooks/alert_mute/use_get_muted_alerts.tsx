/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useQuery } from '@tanstack/react-query';
import { AlertsQueryContext } from '@kbn/alerts-ui-shared/src/common/contexts/alerts_query_context';
import { QueryOptionsOverrides } from '@kbn/alerts-ui-shared/src/common/types/tanstack_query_utility_types';
import {
  getRulesWithMutedAlerts,
  GetRulesWithMutedAlertsParams,
} from '../apis/get_rules_with_muted_alerts';
import { useKibana } from '../../../../../common';
import { triggersActionsUiQueriesKeys } from '../../../../hooks/constants';
import { MutedAlerts, ServerError } from '../../types';

const ERROR_TITLE = i18n.translate('xpack.triggersActionsUI.mutedAlerts.api.get', {
  defaultMessage: 'Error fetching muted alerts data',
});

const getMutedAlerts = ({ http, signal, ids }: GetRulesWithMutedAlertsParams) =>
  getRulesWithMutedAlerts({ http, ids, signal }).then(({ data: rules }) =>
    rules?.reduce((mutedAlerts, rule) => {
      mutedAlerts[rule.id] = rule.muted_alert_ids;
      return mutedAlerts;
    }, {} as MutedAlerts)
  );

export interface UseGetMutedAlertsQueryParams {
  ruleIds: string[];
}

export const useGetMutedAlertsQuery = (
  { ruleIds }: UseGetMutedAlertsQueryParams,
  { enabled }: QueryOptionsOverrides<typeof getMutedAlerts> = {}
) => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;
  return useQuery({
    context: AlertsQueryContext,
    queryKey: triggersActionsUiQueriesKeys.mutedAlerts(ruleIds),
    queryFn: ({ signal }) => getMutedAlerts({ http, signal, ids: ruleIds }),
    onError: (error: ServerError) => {
      if (error.name !== 'AbortError') {
        toasts.addError(error.body?.message ? new Error(error.body.message) : error, {
          title: ERROR_TITLE,
        });
      }
    },
    enabled: ruleIds.length > 0 && enabled !== false,
  });
};
