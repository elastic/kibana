/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment } from 'react';
import { SummaryStatus } from '../../summary_status';
import { ElasticsearchStatusIcon } from '../status_icon';
import { formatMetric } from '../../../lib/format_number';
import { FormattedMessage, injectI18n } from '@kbn/i18n/react';

function IndexDetailStatusUI({ stats, intl }) {
  const {
    dataSize,
    documents: documentCount,
    totalShards,
    unassignedShards,
    status
  } = stats;

  const metrics = [
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.indexDetailStatus.totalTitle',
        defaultMessage: 'Total',
      }),
      value: formatMetric(dataSize.total, '0.0 b'),
      dataTestSubj: 'dataSize'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.indexDetailStatus.primariesTitle',
        defaultMessage: 'Primaries',
      }),
      value: formatMetric(dataSize.primaries, '0.0 b'),
      dataTestSubj: 'dataSizePrimaries'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.indexDetailStatus.documentsTitle',
        defaultMessage: 'Documents',
      }),
      value: formatMetric(documentCount, '0.[0]a'),
      dataTestSubj: 'documentCount'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.indexDetailStatus.totalShardsTitle',
        defaultMessage: 'Total Shards',
      }),
      value: formatMetric(totalShards, 'int_commas'),
      dataTestSubj: 'totalShards'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.elasticsearch.indexDetailStatus.unassignedShardsTitle',
        defaultMessage: 'Unassigned Shards',
      }),
      value: formatMetric(unassignedShards, 'int_commas'),
      dataTestSubj: 'unassignedShards'
    }
  ];

  const IconComponent = ({ status }) => (
    <Fragment>
      <FormattedMessage
        id="xpack.monitoring.elasticsearch.indexDetailStatus.iconStatusLabel"
        defaultMessage="Health: {elasticsearchStatusIcon}"
        values={{
          elasticsearchStatusIcon: (
            <ElasticsearchStatusIcon status={status} />
          )
        }}
      />
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

export const IndexDetailStatus = injectI18n(IndexDetailStatusUI);
