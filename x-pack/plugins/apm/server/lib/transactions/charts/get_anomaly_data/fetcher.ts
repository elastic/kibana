/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Logger } from 'kibana/server';
import { PromiseReturnType } from '../../../../../../observability/typings/common';
import { Setup, SetupTimeRange } from '../../../helpers/setup_request';

export type ESResponse = Exclude<
  PromiseReturnType<typeof anomalySeriesFetcher>,
  undefined
>;

export async function anomalySeriesFetcher({
  serviceName,
  transactionType,
  intervalString,
  mlBucketSize,
  setup,
  jobId,
  logger,
}: {
  serviceName: string;
  transactionType: string;
  intervalString: string;
  mlBucketSize: number;
  setup: Setup & SetupTimeRange;
  jobId: string;
  logger: Logger;
}) {
  const { ml, start, end } = setup;
  if (!ml) {
    return;
  }

  // move the start back with one bucket size, to ensure to get anomaly data in the beginning
  // this is required because ML has a minimum bucket size (default is 900s) so if our buckets are smaller, we might have several null buckets in the beginning
  const newStart = start - mlBucketSize * 1000;

  const params = {
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { job_id: jobId } },
            { exists: { field: 'bucket_span' } },
            { term: { result_type: 'model_plot' } },
            { term: { partition_field_value: serviceName } },
            { term: { by_field_value: transactionType } },
            {
              range: {
                timestamp: { gte: newStart, lte: end, format: 'epoch_millis' },
              },
            },
          ],
        },
      },
      aggs: {
        ml_avg_response_times: {
          date_histogram: {
            field: 'timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: newStart, max: end },
          },
          aggs: {
            anomaly_score: { max: { field: 'anomaly_score' } },
            lower: { min: { field: 'model_lower' } },
            upper: { max: { field: 'model_upper' } },
          },
        },
      },
    },
  };

  try {
    const response = await ml.mlSystem.mlAnomalySearch(params);
    return response;
  } catch (err) {
    const isHttpError = 'statusCode' in err;
    if (isHttpError) {
      logger.info(
        `Status code "${err.statusCode}" while retrieving ML anomalies for APM`
      );
      return;
    }
    logger.error('An error occurred while retrieving ML anomalies for APM');
    logger.error(err);
  }
}
