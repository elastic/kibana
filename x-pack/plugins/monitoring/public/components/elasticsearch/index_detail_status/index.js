/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { SummaryStatus } from '../../summary_status';
import { ElasticsearchStatusIcon } from '../status_icon';
import { formatMetric } from '../../../lib/format_number';

export function IndexDetailStatus({ stats }) {
  const {
    dataSize,
    documents: documentCount,
    totalShards,
    unassignedShards,
    status
  } = stats;

  const metrics = [
    {
      label: 'Total',
      value: formatMetric(dataSize.total, '0.0 b'),
      dataTestSubj: 'dataSize'
    },
    {
      label: 'Primaries',
      value: formatMetric(dataSize.primaries, '0.0 b'),
      dataTestSubj: 'dataSizePrimaries'
    },
    {
      label: 'Documents',
      value: formatMetric(documentCount, '0.[0]a'),
      dataTestSubj: 'documentCount'
    },
    {
      label: 'Total Shards',
      value: formatMetric(totalShards, 'int_commas'),
      dataTestSubj: 'totalShards'
    },
    {
      label: 'Unassigned Shards',
      value: formatMetric(unassignedShards, 'int_commas'),
      dataTestSubj: 'unassignedShards'
    }
  ];

  const IconComponent = ({ status }) => (
    <Fragment>
      Health: <ElasticsearchStatusIcon status={status} />
    </Fragment>
  );

  return (
    <SummaryStatus
      metrics={metrics}
      status={status}
      IconComponent={IconComponent}
      data-test-subj="elasticsearchIndexDetailStatus"
    />
  );
}
