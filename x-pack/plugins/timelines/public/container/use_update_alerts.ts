/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpdateDocumentByQueryResponse } from 'elasticsearch';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { AlertStatus } from '../../../timelines/common';

// export const DETECTION_ENGINE_SIGNALS_STATUS_URL = '/api/detection_engine/signals/status';
export const RAC_ALERTS_BULK_UPDATE_URL = '/internal/rac/alerts/bulk_update';

/**
 * Update alert status by query
 *
 * @param query of alerts to update
 * @param status to update to('open' / 'closed' / 'in-progress')
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const useUpdateAlertsStatus = (): {
  updateAlertStatus: (params: {
    status: AlertStatus;
    index: string;
    ids?: string[];
    query?: object;
  }) => Promise<UpdateDocumentByQueryResponse>;
} => {
  const { http } = useKibana().services;
  return {
    updateAlertStatus: ({ status: alertStatus, index, ids, query }) => {
      const status: string = alertStatus === 'in-progress' ? 'acknowledged' : alertStatus;
      console.log({ index, status, query, ids });

      return http!.fetch(RAC_ALERTS_BULK_UPDATE_URL, {
        method: 'POST',
        body: JSON.stringify({ index, status, ...(query ? { query } : { ids }) }),
      });
    },
  };
};
