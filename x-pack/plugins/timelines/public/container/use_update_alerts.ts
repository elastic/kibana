/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import { CoreStart } from '../../../../../src/core/public';

import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { AlertStatus } from '../../../timelines/common';
import {
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
  RAC_ALERTS_BULK_UPDATE_URL,
} from '../../common/constants';

/**
 * Update alert status by query
 *
 * @param status to update to('open' / 'closed' / 'acknowledged')
 * @param index index to be updated
 * @param query optional query object to update alerts by query.

 *
 * @throws An error if response is not OK
 */
export const useUpdateAlertsStatus = (
  timelineId: string
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
      if (['detections-page', 'detections-rules-details-page'].includes(timelineId)) {
        return http!.fetch(DETECTION_ENGINE_SIGNALS_STATUS_URL, {
          method: 'POST',
          body: JSON.stringify({ status, query }),
        });
      } else {
        const { body } = await http.post(RAC_ALERTS_BULK_UPDATE_URL, {
          body: JSON.stringify({ index, status, query }),
        });
        return body;
      }
    },
  };
};

//
