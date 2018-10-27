/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SummaryStatus } from '../../summary_status';
import { formatMetric } from '../../../lib/format_number';
import { i18n } from '@kbn/i18n';

export function Status({ stat, formattedLeader, oldestStat }) {
  const {
    follower_index: followerIndex,
    shard_id: shardId,
    number_of_operations_indexed: operationsReceived,
    number_of_failed_fetches: failedFetches
  } = stat;

  const {
    number_of_operations_indexed: oldestOperationsReceived,
    number_of_failed_fetches: oldestFailedFetches
  } = oldestStat;

  const metrics = [
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.ccrShard.status.followerIndexLabel', {
        defaultMessage: 'Follower Index',
      }),
      value: followerIndex,
      dataTestSubj: 'followerIndex'
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.ccrShard.status.shardIdLabel', {
        defaultMessage: 'Shard Id',
      }),
      value: shardId,
      dataTestSubj: 'shardId'
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.ccrShard.status.leaderIndexLabel', {
        defaultMessage: 'Leader Index',
      }),
      value: formattedLeader,
      dataTestSubj: 'leaderIndex'
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.ccrShard.status.opsSyncedLabel', {
        defaultMessage: 'Ops Synced',
      }),
      value: formatMetric(operationsReceived - oldestOperationsReceived, 'int_commas'),
      dataTestSubj: 'operationsReceived'
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.ccrShard.status.failedFetchesLabel', {
        defaultMessage: 'Failed Fetches',
      }),
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
