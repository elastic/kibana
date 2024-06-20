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
  let message;
  let factor;

  if (baselineBucketRate > 0) {
    if (analysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE) {
      factor = Math.round(((deviationBucketRate / baselineBucketRate) * 100) / 100);
      message = i18n.translate(
        'xpack.aiops.logRateAnalysis.resultsTableGroups.logRateFactorIncreaseLabel',
        {
          defaultMessage: '{factor}x higher',
          values: {
            factor: Math.round(((deviationBucketRate / baselineBucketRate) * 100) / 100),
          },
        }
      );
    } else {
      factor = Math.round(((baselineBucketRate / deviationBucketRate) * 100) / 100);
      message = i18n.translate(
        'xpack.aiops.logRateAnalysis.resultsTableGroups.logRateFactorDecreaseLabel',
        {
          defaultMessage: '{factor}x lower',
          values: {
            factor,
          },
        }
      );
    }
  } else {
    // If the baseline rate is 0, then it can't be LOG_RATE_ANALYSIS_TYPE.DIP so we know it's a SPIKE
    message = i18n.translate(
      'xpack.aiops.logRateAnalysis.resultsTableGroups.logRateDocIncreaseLabel',
      {
        defaultMessage: '{deviationBucketRate} docs up from 0 in baseline',
        values: { deviationBucketRate },
      }
    );
  }
  return { message, factor };
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
