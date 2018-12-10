/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { SummaryStatus } from '../../summary_status';
import { NodeStatusIcon } from '../node';
import { formatMetric } from '../../../lib/format_number';
import { injectI18n } from '@kbn/i18n/react';

function NodeDetailStatusUI({ stats, intl }) {
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
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.nodeDetailStatus.jvmHeapLabel',
        defaultMessage: '{javaVirtualMachine} Heap' }, {
        javaVirtualMachine: 'JVM'
      }),
      value: formatMetric(usedHeap, '0,0.[00]', '%', { prependSpace: false }),
      dataTestSubj: 'jvmHeap'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.nodeDetailStatus.freeDiskSpaceLabel',
        defaultMessage: 'Free Disk Space',
      }),
      value: formatMetric(freeSpace, '0.0 b'),
      dataTestSubj: 'freeDiskSpace'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.nodeDetailStatus.documentsLabel',
        defaultMessage: 'Documents',
      }),
      value: formatMetric(documents, '0.[0]a'),
      dataTestSubj: 'documentCount'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.nodeDetailStatus.dataLabel',
        defaultMessage: 'Data',
      }),
      value: formatMetric(dataSize, '0.0 b'),
      dataTestSubj: 'dataSize'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.nodeDetailStatus.indicesLabel',
        defaultMessage: 'Indices',
      }),
      value: formatMetric(indexCount, 'int_commas'),
      dataTestSubj: 'indicesCount'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.nodeDetailStatus.shardsLabel',
        defaultMessage: 'Shards',
      }),
      value: formatMetric(totalShards, 'int_commas'),
      dataTestSubj: 'shardsCount'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.nodeDetailStatus.typeLabel',
        defaultMessage: 'Type',
      }),
      value: nodeTypeLabel,
      dataTestSubj: 'nodeType'
    }
  ];

  const IconComponent = ({ status, isOnline }) => (
    <Fragment>
      <NodeStatusIcon status={status} isOnline={isOnline} />
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

export const NodeDetailStatus = injectI18n(NodeDetailStatusUI);
