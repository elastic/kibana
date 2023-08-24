/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { KibanaServices } from '../../../lib/kibana';

export interface Body {
  jobIds: string[];
  query: object;
}

export interface AnomaliesSearchResponse {
  aggregations?: {
    number_of_anomalies: {
      buckets: Array<{
        key: string;
        doc_count: number;
      }>;
    };
  };
}

export const anomaliesSearch = async (
  body: Body,
  signal: AbortSignal
): Promise<AnomaliesSearchResponse> => {
  return KibanaServices.get().http.fetch<AnomaliesSearchResponse>(
    '/internal/ml/results/anomaly_search',
    {
      method: 'POST',
      version: '1',
      body: JSON.stringify(body),
      asSystemRequest: true,
      signal,
    }
  );
};
