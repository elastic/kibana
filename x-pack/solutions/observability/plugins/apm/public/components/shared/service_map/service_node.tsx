/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useEuiTheme, EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getAgentIcon } from '@kbn/custom-icons';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { getSeverity, getSeverityColor } from '../../../../common/anomaly_detection';
import type { ServiceNodeData } from '../../../../common/service_map';
import {
  NODE_BORDER_WIDTH_DEFAULT,
  NODE_BORDER_WIDTH_SELECTED,
  SERVICE_NODE_CIRCLE_SIZE,
} from '../../../../common/service_map/constants';
import { NodeLabel } from './node_label';

type ServiceNodeType = Node<ServiceNodeData, 'service'>;

export const ServiceNode = memo(
  ({ data, selected, sourcePosition, targetPosition }: NodeProps<ServiceNodeType>) => {
    const { euiTheme, colorMode } = useEuiTheme();
    const isDarkMode = colorMode === 'DARK';

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

    const iconUrl = useMemo(() => {
      if (data.agentName) {
        return getAgentIcon(data.agentName, isDarkMode);
      }
      return null;
    }, [data.agentName, isDarkMode]);

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

    const showAlertsBadge = data.alertsCount !== undefined && data.alertsCount > 0;

    const alertsTooltip = i18n.translate('xpack.apm.serviceMap.serviceNode.alertsBadgeTooltip', {
      defaultMessage: '{count, plural, one {# active alert} other {# active alerts}}',
      values: { count: data.alertsCount ?? 0 },
    });

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
      border: ${borderWidth} solid ${borderColor};
      background: ${euiTheme.colors.backgroundBasePlain};
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 ${euiTheme.size.xxs} ${euiTheme.size.xxs} ${euiTheme.colors.lightShade};
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

    const badgePointerEventsStyles = css`
      pointer-events: auto;
    `;

    return (
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
        {showAlertsBadge && (
          <EuiFlexItem grow={false}>
            <span css={badgePointerEventsStyles}>
              <EuiBadge
                data-test-subj="serviceMapNodeAlertsBadge"
                color="danger"
                iconType="warning"
                title={alertsTooltip}
              >
                {data.alertsCount}
              </EuiBadge>
            </span>
          </EuiFlexItem>
        )}
        <NodeLabel label={data.label} selected={selected} />
      </EuiFlexGroup>
    );
  }
);

ServiceNode.displayName = 'ServiceNode';
