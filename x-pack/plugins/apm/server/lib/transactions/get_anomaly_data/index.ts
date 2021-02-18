/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { compact } from 'lodash';
import { Logger } from 'src/core/server';
import { isFiniteNumber } from '../../../../common/utils/is_finite_number';
import { maybe } from '../../../../common/utils/maybe';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { getBucketSize } from '../../helpers/get_bucket_size';
import { Setup, SetupTimeRange } from '../../helpers/setup_request';
import { anomalySeriesFetcher } from './fetcher';
import { getMLJobIds } from '../../service_map/get_service_anomalies';
import { ANOMALY_THRESHOLD } from '../../../../../ml/common';
import { withApmSpan } from '../../../utils/with_apm_span';

export async function getAnomalySeries({
  environment,
  serviceName,
  transactionType,
  transactionName,
  setup,
  logger,
}: {
  environment?: string;
  serviceName: string;
  transactionType: string;
  transactionName?: string;
  setup: Setup & SetupTimeRange;
  logger: Logger;
}) {
  const { start, end, ml } = setup;

  // don't fetch anomalies if the ML plugin is not setup
  if (!ml) {
    return undefined;
  }

  // don't fetch anomalies if requested for a specific transaction name
  // as ML results are not partitioned by transaction name
  if (!!transactionName) {
    return undefined;
  }

  // don't fetch anomalies when no specific environment is selected
  if (!environment || environment === ENVIRONMENT_ALL.value) {
    return undefined;
  }

  // Don't fetch anomalies if uiFilters are applied. This filters out anything
  // with empty values so `kuery: ''` returns false but `kuery: 'x:y'` returns true.
  const hasUiFiltersApplied =
    Object.entries(setup.uiFilters).filter(([_key, value]) => !!value).length >
    0;

  if (hasUiFiltersApplied) {
    return undefined;
  }

  return withApmSpan('get_latency_anomaly_series', async () => {
    const { intervalString } = getBucketSize({ start, end });

    // move the start back with one bucket size, to ensure to get anomaly data in the beginning
    // this is required because ML has a minimum bucket size (default is 900s) so if our buckets
    // are smaller, we might have several null buckets in the beginning
    const mlStart = start - 900 * 1000;

    const [anomaliesResponse, jobIds] = await Promise.all([
      anomalySeriesFetcher({
        serviceName,
        transactionType,
        intervalString,
        ml,
        start: mlStart,
        end,
      }),
      getMLJobIds(ml.anomalyDetectors, environment),
    ]);

    const scoreSeriesCollection = anomaliesResponse?.aggregations?.job_id.buckets
      .filter((bucket) => jobIds.includes(bucket.key as string))
      .map((bucket) => {
        const dateBuckets = bucket.ml_avg_response_times.buckets;

        return {
          jobId: bucket.key as string,
          anomalyScore: compact(
            dateBuckets.map((dateBucket) => {
              const metrics = maybe(dateBucket.anomaly_score.top[0])?.metrics;
              const score = metrics?.record_score;

              if (
                !metrics ||
                !isFiniteNumber(score) ||
                score < ANOMALY_THRESHOLD.CRITICAL
              ) {
                return null;
              }

              const anomalyStart = Date.parse(metrics.timestamp as string);
              const anomalyEnd =
                anomalyStart + (metrics.bucket_span as number) * 1000;

              return {
                x0: anomalyStart,
                x: anomalyEnd,
                y: score,
              };
            })
          ),
          anomalyBoundaries: dateBuckets
            .filter(
              (dateBucket) =>
                dateBucket.lower.value !== null &&
                dateBucket.upper.value !== null
            )
            .map((dateBucket) => ({
              x: dateBucket.key,
              y0: dateBucket.lower.value as number,
              y: dateBucket.upper.value as number,
            })),
        };
      });

    if ((scoreSeriesCollection?.length ?? 0) > 1) {
      logger.warn(
        `More than one ML job was found for ${serviceName} for environment ${environment}. Only showing results from ${scoreSeriesCollection?.[0].jobId}`
      );
    }

    return scoreSeriesCollection?.[0];
  });
}
