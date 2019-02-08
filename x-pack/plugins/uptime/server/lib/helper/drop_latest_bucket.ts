/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/**
 * We've had numerous requests to not display semi-full buckets (i.e. it is 13:01 and the
 * bounds of our bucket are 13:00-13:05). If the first bucket isn't done filling, we'll
 * start out with nothing returned, otherwise we drop the most recent bucket.
 * @package bucket The bucket list
 */
export const dropLatestBucket = (bucket: any[]) =>
  bucket.length > 1 ? bucket.slice(0, bucket.length - 1) : [];
