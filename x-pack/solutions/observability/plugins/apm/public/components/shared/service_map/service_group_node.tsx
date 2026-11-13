/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useEuiTheme, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getSeverity, getSeverityColor } from '../../../../common/anomaly_detection';
import type { ServiceGroupNodeData } from '../../../../common/service_map';
import {
  NODE_BORDER_WIDTH_DEFAULT,
  NODE_BORDER_WIDTH_SELECTED,
  NODE_LABEL_MAX_WIDTH,
  SERVICE_NODE_SIZE,
} from '../../../../common/service_map/constants';
import { asDuration, asPercent } from '../../../../common/utils/formatters';
import { NodeLabel } from './node_label';
import { NodeStatsLine } from './node_stats_line';
import { FailureRing } from './failure_ring';
import { formatCompactRate, describeCompactRate } from './compact_rate';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import { AlertsBadge } from '../badge/alerts_badge';
import { SloStatusBadge } from '../slo_status_badge';
import { useServiceMapInteractivity } from './service_map_interactivity_context';
import { HighlightWrapper } from './highlight_wrapper';

type ServiceGroupNodeType = Node<ServiceGroupNodeData, 'serviceGroup'>;

/**
 * Closed service-group node (2+ services). Enter/Space selects only; opening is #300587.
 */
export const ServiceGroupNode = memo(
  ({ data, selected, sourcePosition, targetPosition }: NodeProps<ServiceGroupNodeType>) => {
    const { euiTheme } = useEuiTheme();
    const apmPluginContext = useApmPluginContext();
    const canReadSlos = !!apmPluginContext?.core?.application?.capabilities?.slo?.read;
    const isInteractive = useServiceMapInteractivity();
    const showStats = data.stats !== undefined;

    const { borderColor, borderWidth } = useMemo(() => {
      const score = data.serviceAnomalyStats?.anomalyScore;
      const hasScore = score !== undefined;

      return {
        borderColor: hasScore
          ? getSeverityColor(score)
          : selected
          ? euiTheme.colors.primary
          : euiTheme.colors.mediumShade,
        borderWidth: selected
          ? `${NODE_BORDER_WIDTH_SELECTED}px`
          : `${NODE_BORDER_WIDTH_DEFAULT}px`,
      };
    }, [data.serviceAnomalyStats, selected, euiTheme]);

    const ariaLabel = useMemo(() => {
      const parts = [
        i18n.translate('xpack.apm.serviceMap.serviceGroupNode.ariaLabel', {
          defaultMessage:
            'Service group: {groupName}, {count} {count, plural, one {service} other {services}}',
          values: { groupName: data.label, count: data.memberCount },
        }),
      ];

      if (data.serviceAnomalyStats?.anomalyScore !== undefined) {
        parts.push(
          i18n.translate('xpack.apm.serviceMap.serviceGroupNode.anomalySeverityInfo', {
            defaultMessage: 'Machine learning anomaly severity: {severity}',
            values: { severity: getSeverity(data.serviceAnomalyStats.anomalyScore) },
          })
        );
      }

      if (data.stats) {
        const rateDescribed = describeCompactRate(data.stats.throughput);
        if (rateDescribed) {
          parts.push(rateDescribed);
        }
        if (
          typeof data.stats.failedTransactionRate === 'number' &&
          data.stats.failedTransactionRate > 0
        ) {
          parts.push(
            i18n.translate('xpack.apm.serviceMap.serviceGroupNode.failedShareInfo', {
              defaultMessage: '{share} of requests failed',
              values: { share: asPercent(data.stats.failedTransactionRate, 1) },
            })
          );
        }
        if (typeof data.stats.latency === 'number') {
          parts.push(
            i18n.translate('xpack.apm.serviceMap.serviceGroupNode.latencyInfo', {
              defaultMessage: 'Latency {latency}',
              values: { latency: asDuration(data.stats.latency) },
            })
          );
        }
      }

      return parts.join('. ');
    }, [data.label, data.memberCount, data.serviceAnomalyStats?.anomalyScore, data.stats]);

    const containerStyles = css`
      position: relative;
      width: ${SERVICE_NODE_SIZE}px;
      height: ${SERVICE_NODE_SIZE}px;
    `;

    const handleStyles = css`
      visibility: hidden;
    `;

    // Square (not circle) so closed groups read differently from service nodes.
    const shapeStyles = css`
      width: ${SERVICE_NODE_SIZE}px;
      height: ${SERVICE_NODE_SIZE}px;
      border-radius: ${euiTheme.border.radius.medium};
      border: ${borderWidth} solid ${borderColor};
      background: ${euiTheme.colors.backgroundBasePlain};
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 ${euiTheme.size.xxs} ${euiTheme.size.xxs}
        ${euiTheme.colors.backgroundBaseSubdued};
      cursor: ${isInteractive ? 'pointer' : 'default'};
      pointer-events: all;

      ${isInteractive &&
      css`
        &:focus-visible {
          outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
          outline-offset: ${euiTheme.size.xxs};
        }

        [data-id]:focus &,
        [data-id]:focus-visible & {
          outline: ${euiTheme.border.width.thick} solid ${euiTheme.colors.primary};
          outline-offset: ${euiTheme.size.xxs};
        }
      `}
    `;

    const memberCountStyles = css`
      font-size: ${euiTheme.size.m};
      font-weight: ${euiTheme.font.weight.semiBold};
      color: ${euiTheme.colors.textParagraph};
      pointer-events: none;
    `;

    const memberCountLabelStyles = css`
      font-size: ${euiTheme.size.s};
      color: ${euiTheme.colors.textSubdued};
      text-align: center;
      max-width: ${NODE_LABEL_MAX_WIDTH}px;
      pointer-events: none;
    `;

    const badgesRowStyles = css`
      pointer-events: none;
      max-width: ${NODE_LABEL_MAX_WIDTH}px;
      justify-content: center;
    `;

    const showAlertsBadge = data.alertsCount !== undefined && data.alertsCount > 0;
    const showSloBadge =
      canReadSlos && (data.sloStatus === 'violated' || data.sloStatus === 'degrading');

    const memberCountLabel = i18n.translate(
      'xpack.apm.serviceMap.serviceGroupNode.memberCountLabel',
      {
        defaultMessage: '{count} {count, plural, one {service} other {services}}',
        values: { count: data.memberCount },
      }
    );

    return (
      <HighlightWrapper nodeId={data.id} contextHighlight={Boolean(data.contextHighlight)}>
        <EuiFlexGroup
          direction="column"
          alignItems="center"
          gutterSize="xs"
          responsive={false}
          data-test-subj={`serviceMapNode-serviceGroup-${data.id}`}
        >
          <EuiFlexItem grow={false} css={containerStyles}>
            <Handle type="target" position={targetPosition ?? Position.Left} css={handleStyles} />
            <div
              data-test-subj="serviceMapNodeServiceGroupShape"
              css={shapeStyles}
              role={isInteractive ? 'button' : undefined}
              tabIndex={isInteractive ? 0 : -1}
              aria-label={ariaLabel}
              aria-pressed={isInteractive ? selected : undefined}
            >
              {showStats ? (
                <FailureRing
                  size={SERVICE_NODE_SIZE - 2 * NODE_BORDER_WIDTH_SELECTED}
                  failedRate={data.stats?.failedTransactionRate}
                  requestCount={data.stats?.requestCount}
                >
                  {formatCompactRate(data.stats?.throughput)}
                </FailureRing>
              ) : (
                <span css={memberCountStyles} aria-hidden="true">
                  {data.memberCount}
                </span>
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
                  <AlertsBadge
                    count={data.alertsCount ?? 0}
                    serviceName={data.label}
                    data-test-subj="serviceMapNodeServiceGroupAlertsBadge"
                    // Display-only until open-group / group alerts navigation exists
                  />
                )}
                {showSloBadge && data.sloStatus && (
                  <SloStatusBadge
                    sloStatus={data.sloStatus}
                    sloCount={data.sloCount}
                    serviceName={data.label}
                    compactLabelOnNarrowScreens
                    hideTooltip
                  />
                )}
              </EuiFlexGroup>
            </EuiFlexItem>
          )}
          <NodeLabel label={data.label} selected={selected} />
          <EuiFlexItem grow={false}>
            <EuiText css={memberCountLabelStyles} data-test-subj="serviceMapNodeServiceGroupCount">
              {memberCountLabel}
            </EuiText>
          </EuiFlexItem>
          {showStats && (
            <EuiFlexItem grow={false}>
              <NodeStatsLine stats={data.stats} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </HighlightWrapper>
    );
  }
);

ServiceGroupNode.displayName = 'ServiceGroupNode';
