/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { Anomalies, InfluencerInput, CriteriaFields } from '../types';
import { KibanaServices } from '../../../lib/kibana';

export interface Body {
  jobIds: string[];
  criteriaFields: CriteriaFields[];
  influencers: InfluencerInput[];
  aggregationInterval: string;
  threshold: number;
  earliestMs: number;
  latestMs: number;
  dateFormatTz: string;
  maxRecords: number;
  maxExamples: number;
  influencersFilterQuery?: estypes.QueryDslQueryContainer;
}

export const anomaliesTableData = async (body: Body, signal: AbortSignal): Promise<Anomalies> => {
  return KibanaServices.get().http.fetch<Anomalies>('/internal/ml/results/anomalies_table_data', {
    method: 'POST',
    version: '1',
    body: JSON.stringify(body),
    asSystemRequest: true,
    signal,
  });
};
