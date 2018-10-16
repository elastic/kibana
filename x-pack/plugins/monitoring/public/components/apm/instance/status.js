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
import { formatTimestampToDuration } from '../../../../common';

export function Status({ stats }) {
  const {
    name,
    output,
    version,
    uptime,
    timeOfLastEvent,
  } = stats;

  const metrics = [
    {
      label: 'Name',
      value: name,
      dataTestSubj: 'name'
    },
    {
      label: 'Output',
      value: output,
      dataTestSubj: 'output'
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
    },
    {
      label: 'Last Event',
      value: formatTimestampToDuration(+moment(timeOfLastEvent), 'since') + ' ago',
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
