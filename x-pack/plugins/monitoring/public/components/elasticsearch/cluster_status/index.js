/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SummaryStatus } from '../../summary_status';
import { ElasticsearchStatusIcon } from '../status_icon';
import { formatMetric } from '../../../lib/format_number';
import { injectI18n } from '@kbn/i18n/react';

function ClusterStatusUI({ stats, intl }) {
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
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.clusterStatus.nodesLabel',
        defaultMessage: 'Nodes',
      }),
      value: nodesCount,
      'data-test-subj': 'nodesCount'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.clusterStatus.indicesLabel',
        defaultMessage: 'Indices',
      }),
      value: indicesCount,
      'data-test-subj': 'indicesCount'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.clusterStatus.memoryLabel',
        defaultMessage: 'Memory',
      }),
      value: formatMetric(memUsed, 'byte') + ' / ' + formatMetric(memMax, 'byte'),
      'data-test-subj': 'memory'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.clusterStatus.totalShardsLabel',
        defaultMessage: 'Total Shards',
      }),
      value: totalShards,
      'data-test-subj': 'totalShards'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.clusterStatus.unassignedShardsLabel',
        defaultMessage: 'Unassigned Shards',
      }),
      value: unassignedShards,
      'data-test-subj': 'unassignedShards'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.clusterStatus.documentsLabel',
        defaultMessage: 'Documents',
      }),
      value: formatMetric(documentCount, 'int_commas'),
      'data-test-subj': 'documentCount'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.clusterStatus.dataLabel',
        defaultMessage: 'Data',
      }),
      value: formatMetric(dataSize, 'byte'),
      'data-test-subj': 'dataSize'
    }
  ];

  const IconComponent = ({ status }) => (
    <ElasticsearchStatusIcon status={status} />
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

export const ClusterStatus = injectI18n(ClusterStatusUI);
