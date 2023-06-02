/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GetMetricsHostsAnomaliesSuccessResponsePayload } from '../../../../../../common/http_api/infra_ml';

const anomalies: GetMetricsHostsAnomaliesSuccessResponsePayload = {
  data: {
    anomalies: [
      {
        jobId: 'farequote_metric',
        actual: 758.8220213274412,
        anomalyScore: 0.024881740359975164,
        duration: 900,
        id: 'id1',
        startTime: 1486845000000,
        type: 'metrics_hosts',
        partitionFieldName: 'airline',
        partitionFieldValue: 'NKS',
        typical: 545.7764658569108,
        influencers: ['airline'],
      },
    ],
    hasMoreEntries: false,
    paginationCursors: {
      nextPageCursor: [1, 1],
      previousPageCursor: [0, 0],
    },
  },
};

export const anomaliesHttpResponse = {
  default: () => Promise.resolve({ ...anomalies }),
};

export type AnomaliesHttpMocks = keyof typeof anomaliesHttpResponse;
