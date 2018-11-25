/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBucketSize } from '../../../helpers/get_bucket_size';
import { Setup } from '../../../helpers/setup_request';
import { getAvgResponseTimeAnomalies } from '../get_avg_response_time_anomalies';
import { timeseriesFetcher } from './fetcher';
import { timeseriesTransformer } from './transform';

export interface IOptions {
  serviceName: string;
  transactionType: string;
  transactionName?: string;
  setup: Setup;
}

export async function getTimeseriesData(options: IOptions) {
  const { start, end } = options.setup;
  const { bucketSize } = getBucketSize(start, end, 'auto');

  const avgAnomaliesResponse = await getAvgResponseTimeAnomalies(options);
  const timeseriesResponse = await timeseriesFetcher(options);
  return timeseriesTransformer({
    timeseriesResponse,
    avgAnomaliesResponse,
    bucketSize
  });
}
