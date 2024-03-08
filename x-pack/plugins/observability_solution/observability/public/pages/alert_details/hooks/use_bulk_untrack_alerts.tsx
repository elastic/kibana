/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@tanstack/react-query';
import { INTERNAL_BASE_ALERTING_API_PATH } from '@kbn/alerting-plugin/common';
import { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ValidFeatureId, ALERT_UUID } from '@kbn/rule-data-utils';
import { useKibana } from '../../../utils/kibana_react';

const getQuery = ({
  query,
  alertUuids,
}: {
  query?: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
  alertUuids?: string[];
}) => {
  const arrayifiedQuery = Array.isArray(query) ? query : [query];

  if (alertUuids) {
    arrayifiedQuery.push({
      bool: {
        should: alertUuids.map((alertId) => ({
          term: {
            [ALERT_UUID]: { value: alertId },
          },
        })),
      },
    });
  }

  return arrayifiedQuery.filter((q) => q);
};

export const useBulkUntrackAlerts = () => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const untrackAlerts = useMutation<
    string,
    string,
    {
      query?: Pick<QueryDslQueryContainer, 'bool' | 'ids'>;
      featureIds: ValidFeatureId[];
      alertUuids: string[];
    }
  >(
    ['untrackAlerts'],
    ({ query, featureIds, alertUuids }) => {
      try {
        const body = JSON.stringify({
          query: getQuery({ query, alertUuids }),
          feature_ids: featureIds,
        });
        return http.post(`${INTERNAL_BASE_ALERTING_API_PATH}/alerts/_bulk_untrack`, { body });
      } catch (e) {
        throw new Error(`Unable to parse bulk untrack params: ${e}`);
      }
    },
    {
      onError: (_err, params) => {
        toasts.addDanger(
          i18n.translate(
            'xpack.observability.alerts.untrackConfirmation.errorNotification.descriptionText',
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
            'xpack.observability.alerts.untrackConfirmation.successNotification.descriptionText',
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
