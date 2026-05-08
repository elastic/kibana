/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useEuiTheme, EuiBadge, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { getAgentIcon } from '@kbn/custom-icons';
import { ML_ANOMALY_SEVERITY } from '@kbn/ml-anomaly-utils/anomaly_severity';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getSeverity, getSeverityColor } from '../../../../common/anomaly_detection';
import type { ServiceNodeData } from '../../../../common/service_map';
import {
  NODE_BORDER_WIDTH_DEFAULT,
  NODE_BORDER_WIDTH_SELECTED,
  SERVICE_NODE_CIRCLE_SIZE,
} from '../../../../common/service_map/constants';
import { NodeLabel } from '../../shared/service_map/node_label';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { SloStatusBadge } from '../../shared/slo_status_badge';
import { useServiceMapSloFlyout } from './service_map_slo_flyout_context';
import { useServiceMapAlertsTabNavigate } from './use_service_map_alerts_tab_href';
import { HighlightWrapper } from '../../shared/service_map/highlight_wrapper';

type ServiceNodeType = Node<ServiceNodeData, 'service'>;

export const ServiceNode = memo(
  ({ data, selected, sourcePosition, targetPosition }: NodeProps<ServiceNodeType>) => {
    const contextHighlight = Boolean(data.contextHighlight);
    const { euiTheme, colorMode } = useEuiTheme();
    const { core } = useApmPluginContext();
    const { capabilities } = core.application;
    const canReadSlos = !!capabilities.slo?.read;
    const { onSloBadgeClick } = useServiceMapSloFlyout();
    const navigateToAlertsTab = useServiceMapAlertsTabNavigate(data.label);
    const isDarkMode = colorMode === 'DARK';

    const { borderColor, borderWidth, borderStyle } = useMemo(() => {
      const score = data.serviceAnomalyStats?.anomalyScore;

      if (score !== undefined) {
        const severity = getSeverity(score);
        const isHighSeverity =
          severity === ML_ANOMALY_SEVERITY.CRITICAL || severity === ML_ANOMALY_SEVERITY.MAJOR;

        return {
          borderColor: getSeverityColor(score),
          borderWidth:
            isHighSeverity || selected
              ? `${NODE_BORDER_WIDTH_SELECTED}px`
              : `${NODE_BORDER_WIDTH_DEFAULT}px`,
          borderStyle: isHighSeverity ? ('double' as const) : ('solid' as const),
        };
      }

      return {
        borderColor: selected ? euiTheme.colors.primary : euiTheme.colors.mediumShade,
        borderWidth: selected
          ? `${NODE_BORDER_WIDTH_SELECTED}px`
          : `${NODE_BORDER_WIDTH_DEFAULT}px`,
        borderStyle: 'solid' as const,
      };
    }, [data.serviceAnomalyStats, selected, euiTheme]);

    const iconUrl = useMemo(() => {
      if (data.agentName) {
        return getAgentIcon(data.agentName, isDarkMode);
      }
      return null;
    }, [data.agentName, isDarkMode]);

    // Build accessible label for screen readers
    const ariaLabel = useMemo(() => {
      const parts = [
        i18n.translate('xpack.apm.serviceMap.serviceNode.ariaLabel', {
          defaultMessage: 'Service: {serviceName}',
          values: { serviceName: data.label },
        }),
      ];

      if (data.agentName) {
        parts.push(
          i18n.translate('xpack.apm.serviceMap.serviceNode.agentInfo', {
            defaultMessage: 'Agent: {agentName}',
            values: { agentName: data.agentName },
          })
        );
      }

      if (data.serviceAnomalyStats?.anomalyScore !== undefined) {
        parts.push(
          i18n.translate('xpack.apm.serviceMap.serviceNode.anomalySeverityInfo', {
            defaultMessage: 'Machine learning anomaly severity: {severity}',
            values: { severity: getSeverity(data.serviceAnomalyStats.anomalyScore) },
          })
        );
      }

      return parts.join('. ');
    }, [data.label, data.agentName, data.serviceAnomalyStats?.anomalyScore]);

    const containerStyles = css`
      position: relative;
      width: ${SERVICE_NODE_CIRCLE_SIZE}px;
      height: ${SERVICE_NODE_CIRCLE_SIZE}px;
    `;

    const handleStyles = css`
      visibility: hidden;
    `;

    const circleStyles = css`
      width: ${SERVICE_NODE_CIRCLE_SIZE}px;
      height: ${SERVICE_NODE_CIRCLE_SIZE}px;
      border-radius: 50%;
      border: ${borderWidth} ${borderStyle} ${borderColor};
      background: ${euiTheme.colors.backgroundBasePlain};
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 ${euiTheme.size.xxs} ${euiTheme.size.xxs}
        ${euiTheme.colors.backgroundBaseSubdued};
      cursor: pointer;
      pointer-events: all;

      &:focus-visible {
        outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
        outline-offset: ${euiTheme.size.xxs};
      }

      [data-id]:focus &,
      [data-id]:focus-visible & {
        outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
        outline-offset: ${euiTheme.size.xxs};
      }
    `;

    const iconStyles = css`
      width: 60%;
      height: 60%;
      object-fit: contain;
      pointer-events: none;
    `;

    const badgesRowStyles = css`
      pointer-events: none;
      max-width: 220px;
      justify-content: center;
    `;

    const badgePointerEventsStyles = css`
      pointer-events: auto;
    `;

    // Match service inventory cells: show count when API merged data (no extra capability check;
    // `alerting:show` is enforced when opening linked views; badge is display-only here).
    const showAlertsBadge = data.alertsCount !== undefined && data.alertsCount > 0;

    // Map: only violated/degrading (inventory & header show all SLO statuses).
    const showSloBadge =
      canReadSlos && (data.sloStatus === 'violated' || data.sloStatus === 'degrading');

    const alertsTooltip = i18n.translate('xpack.apm.serviceHeader.alertsBadge.tooltip', {
      defaultMessage:
        '{count, plural, one {# active alert} other {# active alerts}}. Click to view.',
      values: { count: data.alertsCount ?? 0 },
    });

    return (
      <HighlightWrapper nodeId={data.id} contextHighlight={contextHighlight}>
        <EuiFlexGroup
          direction="column"
          alignItems="center"
          gutterSize="xs"
          responsive={false}
          data-test-subj={`serviceMapNode-service-${data.id}`}
        >
          <EuiFlexItem grow={false} css={containerStyles}>
            <Handle type="target" position={targetPosition ?? Position.Left} css={handleStyles} />
            <div
              data-test-subj="serviceMapNodeServiceCircle"
              css={circleStyles}
              role="button"
              tabIndex={0}
              aria-label={ariaLabel}
              aria-pressed={selected}
            >
              {iconUrl && (
                <img src={iconUrl} alt={data.agentName} css={iconStyles} aria-hidden="true" />
              )}
            </div>
            <Handle type="source" position={sourcePosition ?? Position.Right} css={handleStyles} />
          </EuiFlexItem>
          {(showAlertsBadge || showSloBadge) && (
            <EuiFlexItem grow={false}>
              <EuiFlexGroup
                gutterSize="xs"
                alignItems="center"
                justifyContent="center"
                responsive={false}
                wrap
                css={badgesRowStyles}
              >
                {showAlertsBadge && (
                  <span
                    css={badgePointerEventsStyles}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <EuiToolTip position="bottom" content={alertsTooltip}>
                      <EuiBadge
                        data-test-subj="serviceMapNodeAlertsBadge"
                        color="danger"
                        iconType="warning"
                        onClick={navigateToAlertsTab}
                        tabIndex={0}
                        role="button"
                        onClickAriaLabel={alertsTooltip}
                      >
                        {data.alertsCount}
                      </EuiBadge>
                    </EuiToolTip>
                  </span>
                )}
                {showSloBadge && data.sloStatus && (
                  <span
                    css={badgePointerEventsStyles}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                  >
                    <SloStatusBadge
                      sloStatus={data.sloStatus}
                      sloCount={data.sloCount}
                      serviceName={data.label}
                      compactLabelOnNarrowScreens
                      {...(onSloBadgeClick
                        ? {
                            onClick: (e) => {
                              e.stopPropagation();
                              onSloBadgeClick(data.label, data.agentName);
                            },
                          }
                        : { hideTooltip: true })}
                    />
                  </span>
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
          <NodeLabel label={data.label} selected={selected} />
        </EuiFlexGroup>
      </HighlightWrapper>
    );
  }
);

ServiceNode.displayName = 'ServiceNode';
