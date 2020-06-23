/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { SummaryStatus } from '../../summary_status';
import { NodeStatusIcon } from '../node';
import { formatMetric } from '../../../lib/format_number';
import { i18n } from '@kbn/i18n';

export function NodeDetailStatus({ stats }) {
  const {
    transport_address: transportAddress,
    usedHeap,
    freeSpace,
    totalSpace,
    documents,
    dataSize,
    indexCount,
    totalShards,
    nodeTypeLabel,
    status,
    isOnline,
  } = stats;

  const percentSpaceUsed = (freeSpace / totalSpace) * 100;

  const metrics = [
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.nodeDetailStatus.transportAddress', {
        defaultMessage: 'Transport Address',
      }),
      value: transportAddress,
      'data-test-subj': 'transportAddress',
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.nodeDetailStatus.jvmHeapLabel', {
        defaultMessage: '{javaVirtualMachine} Heap',

        values: {
          javaVirtualMachine: 'JVM',
        },
      }),
      value: formatMetric(usedHeap, '0,0.[00]', '%', { prependSpace: false }),
      'data-test-subj': 'jvmHeap',
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.nodeDetailStatus.freeDiskSpaceLabel', {
        defaultMessage: 'Free Disk Space',
      }),
      value:
        formatMetric(freeSpace, '0.0 b') +
        ' (' +
        formatMetric(percentSpaceUsed, '0,0.[00]', '%', { prependSpace: false }) +
        ')',
      'data-test-subj': 'freeDiskSpace',
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.nodeDetailStatus.documentsLabel', {
        defaultMessage: 'Documents',
      }),
      value: formatMetric(documents, '0.[0]a'),
      'data-test-subj': 'documentCount',
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.nodeDetailStatus.dataLabel', {
        defaultMessage: 'Data',
      }),
      value: formatMetric(dataSize, '0.0 b'),
      'data-test-subj': 'dataSize',
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.nodeDetailStatus.indicesLabel', {
        defaultMessage: 'Indices',
      }),
      value: formatMetric(indexCount, 'int_commas'),
      'data-test-subj': 'indicesCount',
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.nodeDetailStatus.shardsLabel', {
        defaultMessage: 'Shards',
      }),
      value: formatMetric(totalShards, 'int_commas'),
      'data-test-subj': 'shardsCount',
    },
    {
      label: i18n.translate('xpack.monitoring.elasticsearch.nodeDetailStatus.typeLabel', {
        defaultMessage: 'Type',
      }),
      value: nodeTypeLabel,
      'data-test-subj': 'nodeType',
    },
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
