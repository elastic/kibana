/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { SummaryStatus } from '../../summary_status';
import { NodeStatusIcon } from '../node';
import { formatMetric } from '../../../lib/format_number';

export function NodeDetailStatus({ stats }) {
  const {
    transport_address: transportAddress,
    usedHeap,
    freeSpace,
    documents,
    dataSize,
    indexCount,
    totalShards,
    nodeTypeLabel,
    status,
    isOnline,
  } = stats;

  const metrics = [
    {
      value: transportAddress,
      dataTestSubj: 'transportAddress'
    },
    {
      label: 'JVM Heap',
      value: formatMetric(usedHeap, '0,0.[00]', '%', { prependSpace: false }),
      dataTestSubj: 'jvmHeap'
    },
    {
      label: 'Free Disk Space',
      value: formatMetric(freeSpace, '0.0 b'),
      dataTestSubj: 'freeDiskSpace'
    },
    {
      label: 'Documents',
      value: formatMetric(documents, '0.[0]a'),
      dataTestSubj: 'documentCount'
    },
    {
      label: 'Data',
      value: formatMetric(dataSize, '0.0 b'),
      dataTestSubj: 'dataSize'
    },
    {
      label: 'Indices',
      value: formatMetric(indexCount, 'int_commas'),
      dataTestSubj: 'indicesCount'
    },
    {
      label: 'Shards',
      value: formatMetric(totalShards, 'int_commas'),
      dataTestSubj: 'shardsCount'
    },
    {
      label: 'Type',
      value: nodeTypeLabel,
      dataTestSubj: 'nodeType'
    }
  ];

  const IconComponent = ({ status, isOnline }) => (
    <Fragment>
      Status: <NodeStatusIcon status={status} isOnline={isOnline} />
    </Fragment>
  );

  return (
    <SummaryStatus
      metrics={metrics}
      status={status}
      isOnline={isOnline}
      IconComponent={IconComponent}
      data-test-subj="elasticsearchNodeDetailStatus"
    />
  );
}
