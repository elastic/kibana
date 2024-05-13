/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantItem } from '@kbn/ml-agg-utils';

export interface GetAiopsLogRateAnalysisFunctionResponse {
  content:
    | string
    | {
        logRateChange: {
          type: string;
          spikeLogRate?: number;
          dipLogRate?: number;
          averageLogRate: number;
          logRateAggregationIntervalUsedForAnalysis: string;
          documentSamplingFactorForAnalysis?: number;
        };
        significantItems: Array<{
          field: string;
          value: string | number;
          type: 'metadata' | 'log message pattern';
          documentCount: number;
          baselineCount: number;
          logIncrease: string;
        }>;
      };
  data: {
    dateHistogram: Record<string, number>;
    logRateAnalysisUILink: string;
    logRateChange: {
      type: string;
      timestamp: string;
      spikeLogRate?: number;
      dipLogRate?: number;
      averageLogRate: number;
      logRateAggregationIntervalUsedForAnalysis: string;
      documentSamplingFactorForAnalysis?: number;
      extendedChangePoint: { startTs: number; endTs: number };
    };
    significantItems: SignificantItem[];
  };
}
