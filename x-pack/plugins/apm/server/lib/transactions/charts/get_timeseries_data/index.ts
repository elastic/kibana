/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getBucketSize } from '../../../helpers/get_bucket_size';
import {
  Setup,
  SetupTimeRange,
  SetupUIFilters
} from '../../../helpers/setup_request';
import { timeseriesFetcher } from './fetcher';
import { timeseriesTransformer } from './transform';

export async function getApmTimeseriesData(options: {
  serviceName: string;
  transactionType: string | undefined;
  transactionName: string | undefined;
  setup: Setup & SetupTimeRange & SetupUIFilters;
}) {
  const { start, end } = options.setup;
  const { bucketSize } = getBucketSize(start, end, 'auto');

  const timeseriesResponse = await timeseriesFetcher(options);
  return timeseriesTransformer({
    timeseriesResponse,
    bucketSize
  });
}
