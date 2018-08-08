/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { SummaryStatus } from '../../summary_status';
import { ElasticsearchStatusIcon } from '../status_icon';
import { formatMetric } from '../../../lib/format_number';

export function ClusterStatus({ stats }) {
  const {
    dataSize,
    nodesCount,
    indicesCount,
    memUsed,
    memMax,
    totalShards,
    unassignedShards,
    documentCount,
    status
  } = stats;

  const metrics = [
    {
      label: 'Nodes',
      value: nodesCount,
      dataTestSubj: 'nodesCount'
    },
    {
      label: 'Indices',
      value: indicesCount,
      dataTestSubj: 'indicesCount'
    },
    {
      label: 'Memory',
      value: formatMetric(memUsed, 'byte') + ' / ' + formatMetric(memMax, 'byte'),
      dataTestSubj: 'memory'
    },
    {
      label: 'Total Shards',
      value: totalShards,
      dataTestSubj: 'totalShards'
    },
    {
      label: 'Unassigned Shards',
      value: unassignedShards,
      dataTestSubj: 'unassignedShards'
    },
    {
      label: 'Documents',
      value: formatMetric(documentCount, 'int_commas'),
      dataTestSubj: 'documentCount'
    },
    {
      label: 'Data',
      value: formatMetric(dataSize, 'byte'),
      dataTestSubj: 'dataSize'
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
      data-test-subj="elasticsearchClusterStatus"
    />
  );
}
