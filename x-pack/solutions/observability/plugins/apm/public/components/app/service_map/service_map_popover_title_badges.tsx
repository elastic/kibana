/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import type { ServiceNodeData } from '../../../../common/service_map';
import { SloStatusBadge } from '../../shared/slo_status_badge';
import { useServiceMapSloFlyout } from '../../shared/service_map/service_map_slo_flyout_context';
import { useServiceMapAlertsTabNavigate } from './use_service_map_alerts_tab_href';
import { AnomaliesBadge } from '../service_inventory/service_list/anomalies_badge';
import { useApmRouter } from '../../../hooks/use_apm_router';
import { useAnyOfApmParams } from '../../../hooks/use_apm_params';

interface Props {
  nodeData: ServiceNodeData;
}

/**
 * Alert, SLO and anomaly badges next to the service map popover title — same
 * behaviour as {@link ServiceNode} badges on the map.
 */
export function ServiceMapPopoverTitleBadges({ nodeData }: Props) {
  const { core } = useApmPluginContext();
  const canReadSlos = !!core.application?.capabilities?.slo?.read;
  const navigateToUrl = core.application?.navigateToUrl;
  const { onSloBadgeClick } = useServiceMapSloFlyout();

  const apmRouter = useApmRouter();
  const { query } = useAnyOfApmParams(
    '/service-map',
    '/services/{serviceName}/service-map',
    '/mobile-services/{serviceName}/service-map'
  );

  const serviceName = nodeData.label;
  const navigateToAlertsTab = useServiceMapAlertsTabNavigate(serviceName);

  const { serviceAnomalyStats } = nodeData;

  const showAlertsBadge = nodeData.alertsCount !== undefined && nodeData.alertsCount > 0;
  const showSloBadge =
    canReadSlos && (nodeData.sloStatus === 'violated' || nodeData.sloStatus === 'degrading');
  const showAnomaliesBadge = serviceAnomalyStats !== undefined;

  if (!showAlertsBadge && !showSloBadge && !showAnomaliesBadge) {
    return null;
  }

  // Strip `kuery` so the map's service-name filter isn't carried into the
  // service overview (same treatment as the alerts redirection — see
  // `useAlertsTabHrefBuilder` — to avoid undesired side effects on the destination).
  const anomaliesOverviewHref = apmRouter.link('/services/{serviceName}/overview', {
    path: { serviceName },
    query: { ...query, kuery: '' },
  });
  const navigateToAnomaliesOverview: React.MouseEventHandler<HTMLButtonElement> = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigateToUrl?.(anomaliesOverviewHref);
  };

  const alertsTooltip = i18n.translate('xpack.apm.serviceHeader.alertsBadge.tooltip', {
    defaultMessage: '{count, plural, one {# active alert} other {# active alerts}}. Click to view.',
    values: { count: nodeData.alertsCount ?? 0 },
  });

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
      {showAlertsBadge && (
        <EuiFlexItem grow={false}>
          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <EuiToolTip position="bottom" content={alertsTooltip}>
              <EuiBadge
                data-test-subj="serviceMapPopoverAlertsBadge"
                color="danger"
                iconType="warning"
                onClick={navigateToAlertsTab}
                tabIndex={0}
                role="button"
                onClickAriaLabel={alertsTooltip}
              >
                {nodeData.alertsCount}
              </EuiBadge>
            </EuiToolTip>
          </span>
        </EuiFlexItem>
      )}
      {showSloBadge && nodeData.sloStatus && (
        <EuiFlexItem grow={false}>
          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <SloStatusBadge
              sloStatus={nodeData.sloStatus}
              sloCount={nodeData.sloCount}
              serviceName={serviceName}
              compactLabelOnNarrowScreens
              {...(onSloBadgeClick
                ? {
                    onClick: (e) => {
                      e.stopPropagation();
                      onSloBadgeClick(serviceName, nodeData.agentName);
                    },
                  }
                : { hideTooltip: true })}
            />
          </span>
        </EuiFlexItem>
      )}
      {serviceAnomalyStats && (
        <EuiFlexItem grow={false}>
          <span onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
            <AnomaliesBadge
              score={serviceAnomalyStats.anomalyScore}
              detectorType={serviceAnomalyStats.detectorType}
              onClick={navigateToAnomaliesOverview}
            />
          </span>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
}
