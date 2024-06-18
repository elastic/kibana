/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { LOG_RATE_ANALYSIS_TYPE } from '@kbn/aiops-log-rate-analysis';

export function getLogRateChange(
  analysisType: typeof LOG_RATE_ANALYSIS_TYPE[keyof typeof LOG_RATE_ANALYSIS_TYPE],
  baselineBucketRate: number,
  deviationBucketRate: number
) {
  const logRateChange =
    baselineBucketRate > 0
      ? analysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE
        ? `${Math.round((deviationBucketRate / baselineBucketRate) * 100) / 100}x higher`
        : `${Math.round((baselineBucketRate / deviationBucketRate) * 100) / 100}x lower`
      : analysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE
      ? i18n.translate(
          'xpack.aiops.logRateAnalysis.resultsTableGroups.logRateIncreaseLabelColumnTooltip',
          {
            defaultMessage: '{deviationBucketRate} docs from 0 in baseline',
            values: { deviationBucketRate },
          }
        )
      : i18n.translate(
          'xpack.aiops.logRateAnalysis.resultsTableGroups.logRateDecreaseLabelColumnTooltip',
          {
            defaultMessage: '0 docs from ${baselineBucketRate} in baseline',
            values: { baselineBucketRate },
          }
        );

  return logRateChange;
}

export function getBaselineAndDeviationRates(
  baselineBuckets: number,
  deviationBuckets: number,
  docCount: number | undefined,
  bgCount: number | undefined
) {
  let baselineBucketRate;
  let deviationBucketRate;

  if (bgCount !== undefined) {
    baselineBucketRate = Math.round(bgCount / baselineBuckets);
  }

  if (docCount !== undefined) {
    deviationBucketRate = Math.round(docCount / deviationBuckets);
  }

  return { baselineBucketRate, deviationBucketRate };
}
