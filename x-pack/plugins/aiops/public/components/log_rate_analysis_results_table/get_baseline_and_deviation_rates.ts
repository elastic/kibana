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

  if (analysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE) {
    if (baselineBucketRate > 0) {
      factor = Math.round(((deviationBucketRate / baselineBucketRate) * 100) / 100);
      message = i18n.translate(
        'xpack.aiops.logRateAnalysis.resultsTableGroups.logRateFactorIncreaseLabel',
        {
          defaultMessage: '{factor}x higher',
          values: {
            factor,
          },
        }
      );
    } else {
      message = i18n.translate(
        'xpack.aiops.logRateAnalysis.resultsTableGroups.logRateDocIncreaseLabel',
        {
          defaultMessage:
            '{deviationBucketRate} {deviationBucketRate, plural, one {doc} other {docs}} rate up from 0 in baseline',
          values: { deviationBucketRate },
        }
      );
    }
  } else {
    if (deviationBucketRate > 0) {
      // For dip, "doc count" refers to the amount of documents in the baseline time range so we use baselineBucketRate
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
    } else {
      message = i18n.translate(
        'xpack.aiops.logRateAnalysis.resultsTableGroups.logRateDocDecreaseLabel',
        {
          defaultMessage: 'docs rate down to 0 from {baselineBucketRate} in baseline',
          values: { baselineBucketRate },
        }
      );
    }
  }

  return { message, factor };
}

export function getBaselineAndDeviationRates(
  analysisType: typeof LOG_RATE_ANALYSIS_TYPE[keyof typeof LOG_RATE_ANALYSIS_TYPE],
  baselineBuckets: number,
  deviationBuckets: number,
  docCount: number | undefined,
  bgCount: number | undefined
) {
  let baselineBucketRate;
  let deviationBucketRate;
  if (analysisType === LOG_RATE_ANALYSIS_TYPE.SPIKE) {
    if (bgCount !== undefined) {
      baselineBucketRate = Math.round(bgCount / baselineBuckets);
    }

    if (docCount !== undefined) {
      deviationBucketRate = Math.round(docCount / deviationBuckets);
    }
  } else {
    // For dip, the "doc count" refers to the amount of documents in the baseline time range so we set baselineBucketRate
    if (docCount !== undefined) {
      baselineBucketRate = Math.round(docCount / baselineBuckets);
    }

    if (bgCount !== undefined) {
      deviationBucketRate = Math.round(bgCount / deviationBuckets);
    }
  }

  return { baselineBucketRate, deviationBucketRate };
}
