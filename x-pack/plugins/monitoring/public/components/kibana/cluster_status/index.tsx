/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiLink, EuiStat, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useLocation } from 'react-router-dom';
import type { AlertsByName } from '../../../alerts/types';
import { ExternalConfigContext } from '../../../application/contexts/external_config_context';
import { formatMetric } from '../../../lib/format_number';
import { getSafeForExternalLink } from '../../../lib/get_safe_for_external_link';
import { DefaultStatusIndicator, SummaryStatus } from '../../summary_status';
import { KibanaStatusIcon } from '../status_icon';

interface ClusterStatusProps {
  stats: {
    concurrent_connections: number;
    count: number;
    memory_limit: number;
    memory_size: number;
    requests_total: number;
    response_time_max: number;
    status: string;
    some_status_is_stale: boolean;
  };
  alerts?: AlertsByName;
}

interface IndicatorProps {
  staleMessage: React.ReactNode;
}

export function ClusterStatus({ stats, alerts }: ClusterStatusProps) {
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
          "It's been more than {staleStatusThresholdSeconds} seconds since we have heard from some instances.",
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

function OverviewPageStatusIndicator({ staleMessage }: IndicatorProps) {
  const instancesHref = getSafeForExternalLink('#/kibana/instances');

  const title = (
    <>
      <div style={{ marginBottom: '8px' }}>
        <EuiToolTip position="top" content={staleMessage}>
          <EuiBadge iconType="alert" color="warning">
            {i18n.translate(
              'xpack.monitoring.kibana.clusterStatus.overview.staleStatusInstancesLabel',
              {
                defaultMessage: 'Stale',
              }
            )}
          </EuiBadge>
        </EuiToolTip>
      </div>
      <EuiLink href={instancesHref}>
        {i18n.translate(
          'xpack.monitoring.kibana.clusterStatus.overview.staleStatusLinkToInstancesLabel',
          {
            defaultMessage: 'View all instances',
          }
        )}
      </EuiLink>
    </>
  );

  return (
    <EuiStat
      data-test-subj="status"
      description={i18n.translate('xpack.monitoring.kibana.clusterStatus.overview.statusLabel', {
        defaultMessage: 'Status',
      })}
      title={title}
      titleSize="xxxs"
      textAlign="left"
      className="monSummaryStatusNoWrap__stat"
    />
  );
}

function InstancesPageStatusIndicator({ staleMessage }: IndicatorProps) {
  const title = (
    <EuiToolTip position="top" content={staleMessage}>
      <EuiBadge iconType="alert" color="warning">
        {i18n.translate(
          'xpack.monitoring.kibana.clusterStatus.instances.staleStatusInstancesLabel',
          {
            defaultMessage: 'Stale',
          }
        )}
      </EuiBadge>
    </EuiToolTip>
  );

  return (
    <EuiStat
      data-test-subj="status"
      description={i18n.translate('xpack.monitoring.kibana.clusterStatus.instances.statusLabel', {
        defaultMessage: 'Status',
      })}
      title={title}
      titleSize="xxxs"
      textAlign="left"
      className="monSummaryStatusNoWrap__stat"
    />
  );
}
