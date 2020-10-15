/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getDateBucketOptions } from '../../common/utils/get_date_bucket_options';

import { useUrlParams } from './useUrlParams';

const DEFAULTS = {
  bucketSizeInSeconds: 1,
  intervalString: '1s',
  unit: 'second' as const,
};

export function useDateBucketOptions(numBuckets?: number) {
  const {
    urlParams: { start, end },
  } = useUrlParams();

  if (!start || !end) {
    return DEFAULTS;
  }

  return getDateBucketOptions(
    new Date(start).getTime(),
    new Date(end).getTime(),
    numBuckets
  );
}
