/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SummaryStatus } from '../../summary_status';
import { formatMetric } from '../../../lib/format_number';
import { injectI18n } from '@kbn/i18n/react';

function StatusUI({ stat, formattedLeader, oldestStat, intl }) {
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
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.ccrShard.status.followerIndexLabel',
        defaultMessage: 'Follower Index',
      }),
      value: followerIndex,
      dataTestSubj: 'followerIndex'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.ccrShard.status.shardIdLabel',
        defaultMessage: 'Shard Id',
      }),
      value: shardId,
      dataTestSubj: 'shardId'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.ccrShard.status.leaderIndexLabel',
        defaultMessage: 'Leader Index',
      }),
      value: formattedLeader,
      dataTestSubj: 'leaderIndex'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.ccrShard.status.opsSyncedLabel',
        defaultMessage: 'Ops Synced',
      }),
      value: formatMetric(operationsReceived - oldestOperationsReceived, 'int_commas'),
      dataTestSubj: 'operationsReceived'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.ccrShard.status.failedFetchesLabel',
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

export const Status = injectI18n(StatusUI);
