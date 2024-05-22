/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  LogRateChange,
  SimpleSignificantItem,
} from '@kbn/aiops-log-rate-analysis/queries/fetch_simple_log_rate_analysis';

export interface GetAiopsLogRateAnalysisFunctionResponse {
  content:
    | string
    | {
        logRateChange: Pick<
          LogRateChange,
          | 'type'
          | 'logRateChangeCount'
          | 'averageLogRateCount'
          | 'logRateAggregationIntervalUsedForAnalysis'
          | 'documentSamplingFactorForAnalysis'
        >;
        significantItems: SimpleSignificantItem[];
      };

  data: {
    dateHistogram: Record<string, number>;
    logRateAnalysisUILink: string;
    logRateChange: LogRateChange;
    significantItems: SimpleSignificantItem[];
  };
}
