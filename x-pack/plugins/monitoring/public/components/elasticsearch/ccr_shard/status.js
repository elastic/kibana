/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { get } from 'lodash';
import { SummaryStatus } from '../../summary_status';
import { formatMetric } from '../../../lib/format_number';
import { i18n } from '@kbn/i18n';
import { AlertsStatus } from '../../../alerts/status';

export function Status({ stat, formattedLeader, oldestStat, alerts = {} }) {
  const followerIndex = stat.follower_index || get(stat, 'follower.index');
  const shardId = stat.shard_id || get(stat, 'follower.shard.number');
  const operationsReceived = stat.operations_written || get(stat, 'follower.operations_written');
  const failedFetches = stat.failed_read_requests || get(stat, 'requests.failed.read.count');
  const oldestOperationsReceived =
    oldestStat.operations_written || get(oldestStat, 'follower.operations_written');
  const oldestFailedFetches =
    oldestStat.failed_read_requests || get(oldestStat, 'requests.failed.read.count');

  const metrics = [
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.ccrShard.status.alerts', {
        defaultMessage: 'Alerts',
      }),
      value: <AlertsStatus alerts={alerts} showOnlyCount={true} />,
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.ccrShard.status.followerIndexLabel', {
        defaultMessage: 'Follower Index',
      }),
      value: followerIndex,
      'data-test-subj': 'followerIndex',
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.ccrShard.status.shardIdLabel', {
        defaultMessage: 'Shard Id',
      }),
      value: shardId,
      'data-test-subj': 'shardId',
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.ccrShard.status.leaderIndexLabel', {
        defaultMessage: 'Leader Index',
      }),
      value: formattedLeader,
      'data-test-subj': 'leaderIndex',
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.ccrShard.status.opsSyncedLabel', {
        defaultMessage: 'Ops Synced',
      }),
      value: formatMetric(operationsReceived - oldestOperationsReceived, 'int_commas'),
      'data-test-subj': 'operationsReceived',
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.ccrShard.status.failedFetchesLabel', {
        defaultMessage: 'Failed Fetches',
      }),
      value: formatMetric(failedFetches - oldestFailedFetches, 'int_commas'),
      'data-test-subj': 'failedFetches',
    },
  ];

  return <SummaryStatus metrics={metrics} data-test-subj="ccrDetailStatus" />;
}
