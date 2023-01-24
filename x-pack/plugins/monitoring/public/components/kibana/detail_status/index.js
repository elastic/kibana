/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiStat, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import { capitalize } from 'lodash';
import React from 'react';
import { ExternalConfigContext } from '../../../application/contexts/external_config_context';
import { formatMetric } from '../../../lib/format_number';
import { DefaultStatusIndicator, SummaryStatus } from '../../summary_status';
import { formatLastSeenTimestamp } from '../format_last_seen_timestamp';
import { KibanaStatusIcon } from '../status_icon';

export function DetailStatus({ stats }) {
  const {
    transport_address: transportAddress,
    os_memory_free: osFreeMemory,
    version,
    uptime,
    status,
    statusIsStale,
    lastSeenTimestamp,
  } = stats;

  const { staleStatusThresholdSeconds } = React.useContext(ExternalConfigContext);
  const dateFormat = useUiSetting('dateFormat');

  const metrics = [
    {
      label: i18n.translate('xpack.monitoring.kibana.detailStatus.transportAddressLabel', {
        defaultMessage: 'Transport Address',
      }),
      value: transportAddress,
      'data-test-subj': 'transportAddress',
    },
    {
      label: i18n.translate('xpack.monitoring.kibana.detailStatus.osFreeMemoryLabel', {
        defaultMessage: 'OS Free Memory',
      }),
      value: formatMetric(osFreeMemory, 'byte'),
      'data-test-subj': 'osFreeMemory',
    },
    {
      label: i18n.translate('xpack.monitoring.kibana.detailStatus.versionLabel', {
        defaultMessage: 'Version',
      }),
      value: version,
      'data-test-subj': 'version',
    },
    {
      label: i18n.translate('xpack.monitoring.kibana.detailStatus.uptimeLabel', {
        defaultMessage: 'Uptime',
      }),
      value: formatMetric(uptime, 'time_since'),
      'data-test-subj': 'uptime',
    },
  ];

  const StatusIndicator = () => {
    if (!statusIsStale) {
      return (
        <DefaultStatusIndicator status={status} isOnline={true} IconComponent={KibanaStatusIcon} />
      );
    }

    const { description, title } = prepareStaleMessage(
      status,
      lastSeenTimestamp,
      staleStatusThresholdSeconds,
      dateFormat
    );

    return (
      <EuiStat
        data-test-subj="status"
        description={description}
        title={title}
        titleSize="xxxs"
        textAlign="left"
        className="monSummaryStatusNoWrap__stat"
      />
    );
  };

  return (
    <SummaryStatus
      StatusIndicator={StatusIndicator}
      metrics={metrics}
      data-test-subj="kibanaDetailStatus"
    />
  );
}

function prepareStaleMessage(status, lastSeenTimestamp, staleStatusThresholdSeconds, dateFormat) {
  const { shouldShowRelativeTime, relativeTime, formattedTimestamp } = formatLastSeenTimestamp(
    lastSeenTimestamp,
    dateFormat
  );

  const staleMessage = i18n.translate('xpack.monitoring.kibana.detailStatus.staleStatusTooltip', {
    defaultMessage:
      "It's been more than {staleStatusThresholdSeconds} seconds since we have heard from this instance. Last seen: {lastSeenTimestamp}",
    values: {
      staleStatusThresholdSeconds,
      lastSeenTimestamp: shouldShowRelativeTime ? relativeTime : formattedTimestamp,
    },
  });

  const description = i18n.translate(
    'xpack.monitoring.kibana.detailStatus.staleStatusMetricDescription',
    {
      defaultMessage: 'Last Reported Status',
    }
  );

  const title = (
    <>
      <KibanaStatusIcon status={status} />
      &nbsp;
      {capitalize(status)}
      <span style={{ marginLeft: '8px' }}>
        <EuiToolTip position="top" content={staleMessage}>
          <EuiBadge iconType="alert" color="warning">
            {i18n.translate('xpack.monitoring.kibana.detailStatus.staleStatusLabel', {
              defaultMessage: 'Stale',
            })}
          </EuiBadge>
        </EuiToolTip>
      </span>
    </>
  );

  return {
    description,
    title,
  };
}
