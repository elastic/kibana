/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DateBucketUnit } from '../../../common/utils/get_date_bucket_options';

import { Setup, SetupTimeRange } from '../helpers/setup_request';
import { transactionGroupsFetcher, Options } from './fetcher';

export async function getTransactionGroupList({
  options,
  setup,
  unit,
}: {
  options: Options;
  setup: Setup & SetupTimeRange;
  unit: DateBucketUnit;
}) {
  const bucketSize = setup.config['xpack.apm.ui.transactionGroupBucketSize'];
  return await transactionGroupsFetcher({
    options,
    setup,
    bucketSize,
    unit,
  });
}
