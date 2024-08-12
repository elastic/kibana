/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useMutation } from '@tanstack/react-query';
import { BASE_RAC_ALERTS_API_PATH } from '@kbn/alerts-ui-shared/src/common/constants';
import { useKibana } from '../../../utils/kibana_react';

export const useUpdateInvestigationIds = () => {
  const {
    http,
    notifications: { toasts },
  } = useKibana().services;

  const updateInvestigationIds = useMutation<
    string,
    string,
    { index: string; alertUuid: string; investigationIds: string[] }
  >(
    ['updateInvestigationIds'],
    ({ index, alertUuid, investigationIds }) => {
      try {
        const body = JSON.stringify({
          index,
          alertUuid,
          investigationIds,
        });
        return http.post(`${BASE_RAC_ALERTS_API_PATH}/_update_investigaion_ids`, { body });
      } catch (e) {
        throw new Error(`Unable to parse update investigaion ids params: ${e}`);
      }
    },
    {
      onError: (_err, params) => {
        toasts.addDanger(
          i18n.translate(
            'xpack.observability.alerts.updateInvestigationIds.errorNotification.descriptionText',
            {
              defaultMessage: 'Failed to update investigaion ids',
            }
          )
        );
      },
    }
  );

  return updateInvestigationIds;
};
