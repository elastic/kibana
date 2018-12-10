/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SummaryStatus } from '../../summary_status';
import { KibanaStatusIcon } from '../status_icon';
import { formatMetric } from '../../../lib/format_number';
import { injectI18n } from '@kbn/i18n/react';

function DetailStatusUI({ stats, intl }) {
  const {
    transport_address: transportAddress,
    os_memory_free: osFreeMemory,
    version,
    uptime,
    status
  } = stats;

  const metrics = [
    {
      value: transportAddress,
      dataTestSubj: 'transportAddress'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.kibana.detailStatus.osFreeMemoryLabel',
        defaultMessage: 'OS Free Memory'
      }),
      value: formatMetric(osFreeMemory, 'byte'),
      dataTestSubj: 'osFreeMemory'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.kibana.detailStatus.versionLabel',
        defaultMessage: 'Version'
      }),
      value: version,
      dataTestSubj: 'version'
    },
    {
      label: intl.formatMessage({
        id: 'xpack.monitoring.kibana.detailStatus.uptimeLabel',
        defaultMessage: 'Uptime'
      }),
      value: formatMetric(uptime, 'time_since'),
      dataTestSubj: 'uptime'
    }
  ];

  const IconComponent = ({ status }) => (
    <KibanaStatusIcon status={status} />
  );

  return (
    <SummaryStatus
      metrics={metrics}
      status={status}
      IconComponent={IconComponent}
      data-test-subj="kibanaDetailStatus"
    />
  );
}

export const DetailStatus = injectI18n(DetailStatusUI);
