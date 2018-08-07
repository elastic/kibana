/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { SummaryStatus } from '../../summary_status';
import { ApmStatusIcon } from '../status_icon';

export function ClusterStatus({ stats }) {
  const {
    count: instances,
    requests_total: requests,
  } = stats;

  const status = instances === 0 ? 'red' : 'green';

  const metrics = [
    {
      label: 'Instances',
      value: instances,
      dataTestSubj: 'instances'
    },
    {
      label: 'Requests',
      value: requests,
      dataTestSubj: 'requests'
    },
  ];

  const IconComponent = ({ status }) => (
    <Fragment>
      Status: <ApmStatusIcon status={status} />
    </Fragment>
  );

  return (
    <SummaryStatus
      metrics={metrics}
      status={status}
      IconComponent={IconComponent}
      data-test-subj="apmClusterStatus"
    />
  );
}
