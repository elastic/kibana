/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SummaryStatus } from '../../summary_status';
import { formatMetric } from '../../../lib/format_number';
<<<<<<< HEAD

export function Status({ stat, formattedLeader, oldestStat }) {
=======
import { injectI18n } from '@kbn/i18n/react';

function StatusUI({ stat, formattedLeader, oldestStat, intl }) {
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
      label: 'Follower Index',
=======
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.ccrShard.status.followerIndexLabel',
        defaultMessage: 'Follower Index',
      }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
      value: followerIndex,
      dataTestSubj: 'followerIndex'
    },
    {
<<<<<<< HEAD
      label: 'Shard Id',
=======
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.ccrShard.status.shardIdLabel',
        defaultMessage: 'Shard Id',
      }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
      value: shardId,
      dataTestSubj: 'shardId'
    },
    {
<<<<<<< HEAD
      label: 'Leader Index',
=======
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.ccrShard.status.leaderIndexLabel',
        defaultMessage: 'Leader Index',
      }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
      value: formattedLeader,
      dataTestSubj: 'leaderIndex'
    },
    {
<<<<<<< HEAD
      label: 'Ops Synced',
=======
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.ccrShard.status.opsSyncedLabel',
        defaultMessage: 'Ops Synced',
      }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
      value: formatMetric(operationsReceived - oldestOperationsReceived, 'int_commas'),
      dataTestSubj: 'operationsReceived'
    },
    {
<<<<<<< HEAD
      label: 'Failed Fetches',
=======
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.ccrShard.status.failedFetchesLabel',
        defaultMessage: 'Failed Fetches',
      }),
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
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
<<<<<<< HEAD
=======

export const Status = injectI18n(StatusUI);
>>>>>>> ff49a1c6742d67fa5daed569ff3bb269783f6bd1
