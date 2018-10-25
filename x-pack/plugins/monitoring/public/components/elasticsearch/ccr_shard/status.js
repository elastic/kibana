/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SummaryStatus } from '../../summary_status';
import { formatMetric } from '../../../lib/format_number';

export function Status({ stat, formattedLeader, oldestStat }) {
  const {
    follower_index: followerIndex,
    shard_id: shardId,
    operations_written: operationsReceived,
    failed_read_requests: failedFetches
  } = stat;

  const {
    operations_written: oldestOperationsReceived,
    failed_read_requests: oldestFailedFetches
  } = oldestStat;

  const metrics = [
    {
      label: 'Follower Index',
      value: followerIndex,
      dataTestSubj: 'followerIndex'
    },
    {
      label: 'Shard Id',
      value: shardId,
      dataTestSubj: 'shardId'
    },
    {
      label: 'Leader Index',
      value: formattedLeader,
      dataTestSubj: 'leaderIndex'
    },
    {
      label: 'Ops Synced',
      value: formatMetric(operationsReceived - oldestOperationsReceived, 'int_commas'),
      dataTestSubj: 'operationsReceived'
    },
    {
      label: 'Failed Fetches',
      value: formatMetric(failedFetches - oldestFailedFetches, 'int_commas'),
      dataTestSubj: 'failedFetches'
    },
  ];

  return (
    <SummaryStatus
      metrics={metrics}
      data-test-subj="ccrDetailStatus"
    />
  );
}
