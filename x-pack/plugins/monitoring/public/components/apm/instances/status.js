/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import moment from 'moment';
import { SummaryStatus } from '../../summary_status';
import { ApmStatusIcon } from '../status_icon';
import { formatMetric } from '../../../lib/format_number';

export function Status({ stats }) {
  const {
    beats: {
      total
    },
    bytesSent,
    totalEvents,
    timeOfLastEvent,
  } = stats;

  const metrics = [
    {
      label: 'Servers',
      value: total,
      dataTestSubj: 'total'
    },
    {
      label: 'Bytes Sent',
      value: formatMetric(bytesSent, 'bytes'),
      dataTestSubj: 'bytesSent'
    },
    {
      label: 'Total Events',
      value: formatMetric(totalEvents, '0.[0]a'),
      dataTestSubj: 'totalEvents'
    },
    {
      label: 'Last Event',
      value: formatMetric(+moment(timeOfLastEvent), 'time_since2', 'ago'),
      dataTestSubj: 'timeOfLastEvent',
    }
  ];

  const IconComponent = ({ status }) => (
    <Fragment>
      Status: <ApmStatusIcon status={status} />
    </Fragment>
  );

  return (
    <SummaryStatus
      metrics={metrics}
      IconComponent={IconComponent}
      data-test-subj="apmDetailStatus"
    />
  );
}
