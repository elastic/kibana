/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SummaryStatus } from '../../summary_status';
import { KibanaStatusIcon } from '../status_icon';
import { formatMetric } from '../../../lib/format_number';
import { injectI18n } from '@kbn/i18n/react';

function ClusterStatusUI({ stats, intl }) {
  const {
    concurrent_connections: connections,
    count: instances,
    memory_limit: memLimit,
    memory_size: memSize,
    requests_total: requests,
    response_time_max: maxResponseTime,
    status,
  } = stats;

  const metrics = [
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.kibana.clusterStatus.instancesLabel',
        defaultMessage: 'Instances'
      }),
      value: instances,
      dataTestSubj: 'instances'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.kibana.clusterStatus.memoryLabel',
        defaultMessage: 'Memory'
      }),
      value: formatMetric(memSize, 'byte') + ' / ' + formatMetric(memLimit, 'byte'),
      dataTestSubj: 'memory'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.kibana.clusterStatus.requestsLabel',
        defaultMessage: 'Requests'
      }),
      value: requests,
      dataTestSubj: 'requests'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.kibana.clusterStatus.connectionsLabel',
        defaultMessage: 'Connections'
      }),
      value: connections,
      dataTestSubj: 'connections'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.kibana.clusterStatus.maxResponseTimeLabel',
        defaultMessage: 'Max. Response Time'
      }),
      value: formatMetric(maxResponseTime, '0', 'ms'),
      dataTestSubj: 'maxResponseTime'
    }
  ];

  const IconComponent = ({ status }) => (
    <KibanaStatusIcon status={status} />
  );

  return (
    <SummaryStatus
      metrics={metrics}
      status={status}
      IconComponent={IconComponent}
      data-test-subj="kibanaClusterStatus"
    />
  );
}

export const ClusterStatus = injectI18n(ClusterStatusUI);
