/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SummaryStatus } from '../../summary_status';
import { formatMetric } from '../../../lib/format_number';
import { injectI18n } from '@kbn/i18n/react';

function ClusterStatusUi({ stats, intl }) {
  const {
    node_count: nodeCount,
    avg_memory_used: avgMemoryUsed,
    avg_memory: avgMemory,
    events_in_total: eventsInTotal,
    events_out_total: eventsOutTotal
  } = stats;

  const metrics = [
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.logstash.clusterStatus.nodesLabel', defaultMessage: 'Nodes'
      }),
      value: nodeCount,
      'data-test-subj': 'node_count'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.logstash.clusterStatus.memoryLabel', defaultMessage: 'Memory'
      }),
      value: formatMetric(avgMemoryUsed, 'byte') + ' / ' + formatMetric(avgMemory, 'byte'),
      'data-test-subj': 'memory_used'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.logstash.clusterStatus.eventsReceivedLabel', defaultMessage: 'Events Received'
      }),
      value: formatMetric(eventsInTotal, '0.[0]a'),
      'data-test-subj': 'events_in_total'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.logstash.clusterStatus.eventsEmittedLabel', defaultMessage: 'Events Emitted'
      }),
      value: formatMetric(eventsOutTotal, '0.[0]a'),
      'data-test-subj': 'events_out_total'
    }
  ];

  return (
    <SummaryStatus
      metrics={metrics}
      data-test-subj="logstashClusterStatus"
    />
  );
}

export const ClusterStatus = injectI18n(ClusterStatusUi);
