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
        id: 'id1',
        jobId: 'farequote_metric',
        actual: 758.8220213274412,
        anomalyScore: 0.024881740359975164,
        duration: 900,
        startTime: 1681038638000,
        type: 'metrics_hosts',
        partitionFieldName: 'airline',
        partitionFieldValue: 'NKS',
        typical: 545.7764658569108,
        influencers: ['airline'],
      },
      {
        id: 'id2',
        jobId: 'farequote',
        actual: 0.012818,
        anomalyScore: 20.0162059,
        duration: 300,
        startTime: 1455047400000,
        type: 'metrics_hosts',
        partitionFieldName: 'responsetime',
        partitionFieldValue: 'AAL',
        typical: 0.0162059,
        influencers: ['uri', 'status', 'clientip'],
      },
      {
        id: 'id3',
        jobId: 'farequote_metric',
        actual: 758.8220213274412,
        anomalyScore: 100.024881740359975164,
        duration: 900,
        startTime: 1681038638000,
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
  loading: () => new Promise(() => {}),
  noData: () => Promise.resolve({ data: [] }),
};

export type AnomaliesHttpMocks = keyof typeof anomaliesHttpResponse;
