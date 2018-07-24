/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { SummaryStatus } from '../../summary_status';
import { KibanaStatusIcon } from '../status_icon';
import { formatMetric } from '../../../lib/format_number';

export function DetailStatus({ stats }) {
  const {
    transport_address: transportAddress,
    os_memory_free: osFreeMemory,
    version,
    uptime,
    status
  } = stats;

  const metrics = [
    {
      value: transportAddress,
      dataTestSubj: 'transportAddress'
    },
    {
      label: 'OS Free Memory',
      value: formatMetric(osFreeMemory, 'byte'),
      dataTestSubj: 'osFreeMemory'
    },
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
      data-test-subj="kibanaDetailStatus"
    />
  );
}
