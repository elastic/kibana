/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { SummaryStatus } from '../../summary_status';
import { KibanaStatusIcon } from '../status_icon';
import { formatMetric } from '../../../lib/format_number';

export function ClusterStatus({ stats }) {
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
      label: 'Instances',
      value: instances,
      dataTestSubj: 'instances'
    },
    {
      label: 'Memory',
      value: formatMetric(memSize, 'byte') + ' / ' + formatMetric(memLimit, 'byte'),
      dataTestSubj: 'memory'
    },
    {
      label: 'Requests',
      value: requests,
      dataTestSubj: 'requests'
    },
    {
      label: 'Connections',
      value: connections,
      dataTestSubj: 'connections'
    },
    {
      label: 'Max. Response Time',
      value: formatMetric(maxResponseTime, '0', 'ms'),
      dataTestSubj: 'maxResponseTime'
    }
  ];

  const IconComponent = ({ status }) => (
    <Fragment>
      Status: <KibanaStatusIcon status={status} />
    </Fragment>
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
