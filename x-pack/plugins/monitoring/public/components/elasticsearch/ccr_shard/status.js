/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SummaryStatus } from '../../summary_status';
import { formatMetric } from '../../../lib/format_number';

export function Status({ stats }) {
  const {
    follower_index: followerIndex,
    shard_id: shardId,
    leader_index: leaderIndex,
    operations_received: operationsReceived
  } = stats;

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
      value: leaderIndex,
      dataTestSubj: 'leaderIndex'
    },
    {
      label: 'Total Ops Synced',
      value: formatMetric(operationsReceived, 'int_commas'),
      dataTestSubj: 'operationsReceived'
    },
  ];

  return (
    <SummaryStatus
      metrics={metrics}
      data-test-subj="ccrDetailStatus"
    />
  );
}
