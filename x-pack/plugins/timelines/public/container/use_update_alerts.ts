/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { CoreStart } from '@kbn/core/public';

import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { AlertStatus } from '../../common/types';
import {
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
  RAC_ALERTS_BULK_UPDATE_URL,
} from '../../common/constants';

/**
 * Update alert status by query
 *
 * @param useDetectionEngine logic flag for using the regular Detection Engine URL or the RAC URL
 *
 * @param status to update to('open' / 'closed' / 'acknowledged')
 * @param index index to be updated
 * @param query optional query object to update alerts by query.

 *
 * @throws An error if response is not OK
 */
export const useUpdateAlertsStatus = (
  useDetectionEngine: boolean = false
): {
  updateAlertStatus: (params: {
    status: AlertStatus;
    index: string;
    query: object;
  }) => Promise<estypes.UpdateByQueryResponse>;
} => {
  const { http } = useKibana<CoreStart>().services;
  return {
    updateAlertStatus: async ({ status, index, query }) => {
      if (useDetectionEngine) {
        return http.fetch<estypes.UpdateByQueryResponse>(DETECTION_ENGINE_SIGNALS_STATUS_URL, {
          method: 'POST',
          body: JSON.stringify({ status, query }),
        });
      } else {
        const response = await http.post<estypes.UpdateByQueryResponse>(
          RAC_ALERTS_BULK_UPDATE_URL,
          { body: JSON.stringify({ index, status, query }) }
        );
        return response;
      }
    },
  };
};
