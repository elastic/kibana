/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DateBucketUnit } from '../../../../../common/utils/get_date_bucket_options';
import { Setup, SetupTimeRange } from '../../../helpers/setup_request';
import { timeseriesFetcher } from './fetcher';
import { timeseriesTransformer } from './transform';

export async function getApmTimeseriesData(options: {
  serviceName: string;
  transactionType: string | undefined;
  transactionName: string | undefined;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
  bucketSizeInSeconds: number;
  unit: DateBucketUnit;
  intervalString: string;
}) {
  const {
    setup: { start, end },
    unit,
    bucketSizeInSeconds,
  } = options;

  const timeseriesResponse = await timeseriesFetcher(options);
  return timeseriesTransformer({
    timeseriesResponse,
    bucketSizeInSeconds,
    start,
    end,
    unit,
  });
}
