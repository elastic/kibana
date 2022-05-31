/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiLink, EuiToolTip, EuiIcon, EuiStat } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useLocation } from 'react-router-dom';
import { formatMetric } from '../../../lib/format_number';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';
import { ExternalConfigContext } from '../../../application/contexts/external_config_context';
import { SummaryStatus, DefaultStatusIndicator } from '../../summary_status';
import { KibanaStatusIcon } from '../status_icon';

export function ClusterStatus({ stats, alerts }) {
  const {
    concurrent_connections: connections,
    count: instances,
    memory_limit: memLimit,
    memory_size: memSize,
    requests_total: requests,
    response_time_max: maxResponseTime,
    status,
    some_status_is_stale: someStatusIsStale,
  } = stats;

  const { staleStatusThresholdSeconds } = React.useContext(ExternalConfigContext);
  const location = useLocation();

  const metrics = [
    {
      label: i18n.translate('xpack.monitoring.kibana.clusterStatus.instancesLabel', {
        defaultMessage: 'Instances',
      }),
      value: instances,
      'data-test-subj': 'instances',
    },
    {
      label: i18n.translate('xpack.monitoring.kibana.clusterStatus.memoryLabel', {
        defaultMessage: 'Memory',
      }),
      value: formatMetric(memSize, 'byte') + ' / ' + formatMetric(memLimit, 'byte'),
      'data-test-subj': 'memory',
    },
    {
      label: i18n.translate('xpack.monitoring.kibana.clusterStatus.requestsLabel', {
        defaultMessage: 'Requests',
      }),
      value: requests,
      'data-test-subj': 'requests',
    },
    {
      label: i18n.translate('xpack.monitoring.kibana.clusterStatus.connectionsLabel', {
        defaultMessage: 'Connections',
      }),
      value: connections,
      'data-test-subj': 'connections',
    },
    {
      label: i18n.translate('xpack.monitoring.kibana.clusterStatus.maxResponseTimeLabel', {
        defaultMessage: 'Max. Response Time',
      }),
      value: formatMetric(maxResponseTime, '0', 'ms'),
      'data-test-subj': 'maxResponseTime',
    },
  ];

  const StatusIndicator = () => {
    if (!someStatusIsStale) {
      return (
        <DefaultStatusIndicator status={status} isOnline={true} IconComponent={KibanaStatusIcon} />
      );
    }

    const staleMessage = i18n.translate(
      'xpack.monitoring.kibana.clusterStatus.staleStatusTooltip',
      {
        defaultMessage:
          "It's been more than {staleStatusThresholdSeconds} seconds since we heard from some instances.",
        values: {
          staleStatusThresholdSeconds,
        },
      }
    );

    if (location.pathname === '/kibana') {
      return <OverviewPageStatusIndicator staleMessage={staleMessage} />;
    }

    return <InstancesPageStatusIndicator staleMessage={staleMessage} />;
  };

  return (
    <SummaryStatus
      StatusIndicator={StatusIndicator}
      alerts={alerts}
      metrics={metrics}
      data-test-subj="kibanaClusterStatus"
    />
  );
}

function OverviewPageStatusIndicator({ staleMessage }) {
  const instancesHref = getSafeForExternalLink('#/kibana/instances');

  const title = (
    <>
      <div>
        <EuiToolTip position="top" content={staleMessage}>
          <>
            <EuiIcon size="l" type="alert" color="warning" />
            &nbsp;
            {i18n.translate('xpack.monitoring.kibana.clusterStatus.staleStatusInstancesLabel', {
              defaultMessage: 'Stale',
            })}
          </>
        </EuiToolTip>
      </div>
      <EuiLink href={instancesHref}>
        {i18n.translate(
          'xpack.monitoring.cluster.overview.kibanaPanel.staleStatusLinkToInstancesLabel',
          {
            defaultMessage: 'View all instances',
          }
        )}
      </EuiLink>
    </>
  );

  return (
    <EuiStat
      description={i18n.translate('xpack.monitoring.kibana.clusterStatus.statusLabel', {
        defaultMessage: 'Status',
      })}
      title={title}
      titleSize="xxxs"
      textAlign="left"
      className="monSummaryStatusNoWrap__stat"
    />
  );
}

function InstancesPageStatusIndicator({ staleMessage }) {
  const title = (
    <EuiToolTip position="top" content={staleMessage}>
      <span>
        <EuiIcon size="l" type="alert" color="warning" />
        &nbsp;
        {i18n.translate('xpack.monitoring.kibana.clusterStatus.staleStatusInstancesLabel', {
          defaultMessage: 'Stale',
        })}
      </span>
    </EuiToolTip>
  );

  return (
    <EuiStat
      description={i18n.translate('xpack.monitoring.kibana.clusterStatus.statusLabel', {
        defaultMessage: 'Status',
      })}
      title={title}
      titleSize="xxxs"
      textAlign="left"
      className="monSummaryStatusNoWrap__stat"
    />
  );
}
