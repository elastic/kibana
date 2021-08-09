/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UpdateDocumentByQueryResponse } from 'elasticsearch';
import { useKibana } from '../../../../../src/plugins/kibana_react/public';
import { AlertStatus } from '../../../timelines/common';

export const DETECTION_ENGINE_SIGNALS_STATUS_URL = '/api/detection_engine/signals/status';

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
    query: object;
    status: AlertStatus;
  }) => Promise<UpdateDocumentByQueryResponse>;
} => {
  const { http } = useKibana().services;

  return {
    updateAlertStatus: ({ query, status }) =>
      http!.fetch(DETECTION_ENGINE_SIGNALS_STATUS_URL, {
        method: 'POST',
        body: JSON.stringify({ status, query }),
      }),
  };
};
