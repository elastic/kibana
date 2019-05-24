/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getRandomString } from '../../../../test_utils';

export const getSnapshot = ({
  repository = 'my-repo',
  snapshot = getRandomString(),
  uuid = getRandomString(),
  state = 'SUCCESS',
  indexFailures = [],
} = {}) => ({
  repository,
  snapshot,
  uuid,
  versionId: 8000099,
  version: '8.0.0',
  indices: ['.kibana_1', '.kibana_task_manager', '.security-7'],
  includeGlobalState: 1,
  state,
  startTime: '2019-05-23T06:25:15.896Z',
  startTimeInMillis: 1558592715896,
  endTime: '2019-05-23T06:25:16.603Z',
  endTimeInMillis: 1558592716603,
  durationInMillis: 707,
  indexFailures,
  shards: { total: 3, failed: 0, successful: 3 },
});

export const getIndexFailure = (index = getRandomString()) => ({
  index,
  failures: [
    {
      status: 400,
      reason: getRandomString(),
      shard_id: getRandomString(),
    },
  ],
});
