/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SummaryStatus } from '../../summary_status';
import { formatMetric } from '../../../lib/format_number';

export function ClusterStatus({ stats }) {
  const {
    node_count: nodeCount,
    avg_memory_used: avgMemoryUsed,
    avg_memory: avgMemory,
    events_in_total: eventsInTotal,
    events_out_total: eventsOutTotal
  } = stats;

  const metrics = [
    {
      label: 'Nodes',
      value: nodeCount,
      dataTestSubj: 'node_count'
    },
    {
      label: 'Memory',
      value: formatMetric(avgMemoryUsed, 'byte') + ' / ' + formatMetric(avgMemory, 'byte'),
      dataTestSubj: 'memory_used'
    },
    {
      label: 'Events Received',
      value: formatMetric(eventsInTotal, '0.[0]a'),
      dataTestSubj: 'events_in_total'
    },
    {
      label: 'Events Emitted',
      value: formatMetric(eventsOutTotal, '0.[0]a'),
      dataTestSubj: 'events_out_total'
    }
  ];

  return (
    <SummaryStatus
      metrics={metrics}
      data-test-subj="logstashClusterStatus"
    />
  );
}
