/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@tanstack/react-query';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { INTERNAL_BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import { ValidFeatureId } from '@kbn/rule-data-utils';
import { AlertsTableQueryContext } from '../contexts/alerts_table_context';
import { useKibana } from '../../../../common';

export const useBulkUntrackAlertsByQuery = () => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const untrackAlertsByQuery = useMutation<
    string,
    string,
    { query: Pick<QueryDslQueryContainer, 'bool' | 'ids'>; featureIds: ValidFeatureId[] }
  >(
    ['untrackAlerts'],
    ({ query, featureIds }) => {
      try {
        const body = JSON.stringify({
          query: Array.isArray(query) ? query : [query],
          feature_ids: featureIds,
        });
        return http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/alerts/_bulk_untrack_by_query`, {
          body,
        });
      } catch (e) {
        throw new Error(`Unable to parse bulk untrack by query params: ${e}`);
      }
    },
    {
      context: AlertsTableQueryContext,
      onError: () => {
        toasts.addDanger(
          i18n.translate('xpack.triggersActionsUI.alertsTable.untrackByQuery.failedMessage', {
            defaultMessage: 'Failed to untrack alerts by query',
          })
        );
      },

      onSuccess: () => {
        toasts.addSuccess(
          i18n.translate('xpack.triggersActionsUI.alertsTable.untrackByQuery.successMessage', {
            defaultMessage: 'Untracked alerts',
          })
        );
      },
    }
  );

  return untrackAlertsByQuery;
};
