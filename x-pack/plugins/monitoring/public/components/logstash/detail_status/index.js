/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SummaryStatus } from '../../summary_status';
import { formatMetric } from '../../../lib/format_number';

export function DetailStatus({ stats }) {
  const {
    http_address: httpAddress,
    events,
    reloads,
    pipeline,
    queue_type: queueType,
    version,
    uptime
  } = stats;

  const firstMetrics = [
    {
      value: httpAddress,
      dataTestSubj: 'httpAddress'
    },
    {
      label: 'Events Received',
      value: formatMetric(events.in, '0.[0]a'),
      dataTestSubj: 'eventsIn'
    },
    {
      label: 'Events Emitted',
      value: formatMetric(events.out, '0.[0]a'),
      dataTestSubj: 'eventsOut'
    },
    {
      label: 'Config Reloads',
      value: reloads.successes,
      dataTestSubj: 'numReloads'
    },
    {
      label: 'Pipeline Workers',
      value: pipeline.workers,
      dataTestSubj: 'pipelineWorkers'
    },
    {
      label: 'Batch Size',
      value: pipeline.batch_size,
      dataTestSubj: 'pipelineBatchSize'
    }
  ];

  const lastMetrics = [
    {
      label: 'Version',
      value: version,
      dataTestSubj: 'version'
    },
    {
      label: 'Uptime',
      value: formatMetric(uptime, 'time_since'),
      dataTestSubj: 'uptime'
    }
  ];

  // make queueType conditional
  const metrics = [...firstMetrics];
  if (queueType) {
    metrics.push({
      label: 'Queue Type',
      value: queueType,
      dataTestSubj: 'queueType'
    });
  }
  metrics.push(...lastMetrics);

  return (
    <SummaryStatus
      metrics={metrics}
      data-test-subj="logstashDetailStatus"
    />
  );
}
