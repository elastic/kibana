/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, memo } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { useEuiTheme, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { getAgentIcon } from '@kbn/custom-icons';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ServiceNodeData } from '../../../../../common/service_map/react_flow_types';
import {
  getServiceHealthStatusColor,
  getServiceHealthStatusLabel,
  ServiceHealthStatus,
} from '../../../../../common/service_health_status';
import { SERVICE_NODE_CIRCLE_SIZE } from '../../../../../common/service_map/constants';
import { NodeLabel } from './node_label';

type ServiceNodeType = Node<ServiceNodeData, 'service'>;

export const ServiceNode = memo(
  ({ data, selected, sourcePosition, targetPosition }: NodeProps<ServiceNodeType>) => {
    const { euiTheme, colorMode } = useEuiTheme();
    const isDarkMode = colorMode === 'DARK';

    const borderColor = useMemo(() => {
      if (data.serviceAnomalyStats?.healthStatus) {
        return getServiceHealthStatusColor(euiTheme, data.serviceAnomalyStats.healthStatus);
      }
      if (selected) {
        return euiTheme.colors.primary;
      }
      return euiTheme.colors.mediumShade;
    }, [data.serviceAnomalyStats?.healthStatus, selected, euiTheme]);

    const borderWidth = useMemo(() => {
      const status = data.serviceAnomalyStats?.healthStatus;
      if (status === ServiceHealthStatus.critical) return euiTheme.size.xs;
      return euiTheme.size.xxs;
    }, [data.serviceAnomalyStats?.healthStatus, euiTheme.size.xxs, euiTheme.size.xs]);

    const borderStyle = useMemo(() => {
      const status = data.serviceAnomalyStats?.healthStatus;
      if (status === ServiceHealthStatus.critical) return 'double';
      return 'solid';
    }, [data.serviceAnomalyStats?.healthStatus]);

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

      if (data.serviceAnomalyStats?.healthStatus) {
        parts.push(
          i18n.translate('xpack.apm.serviceMap.serviceNode.healthInfo', {
            defaultMessage: 'Health status: {status}',
            values: {
              status: getServiceHealthStatusLabel(
                data.serviceAnomalyStats.healthStatus
              ).toLowerCase(),
            },
          })
        );
      }

      if (selected) {
        parts.push(
          i18n.translate('xpack.apm.serviceMap.serviceNode.selected', {
            defaultMessage: 'Selected',
          })
        );
      }

      parts.push(
        i18n.translate('xpack.apm.serviceMap.serviceNode.instructions', {
          defaultMessage: 'Press Enter or Space to view details',
        })
      );

      return parts.join('. ');
    }, [data.label, data.agentName, data.serviceAnomalyStats?.healthStatus, selected]);

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

    return (
      <EuiFlexGroup
        direction="column"
        alignItems="center"
        gutterSize="s"
        responsive={false}
        data-test-subj={`serviceMapNode-service-${data.id}`}
      >
        <EuiFlexItem grow={false} css={containerStyles}>
          <Handle type="target" position={targetPosition ?? Position.Left} css={handleStyles} />
          <div
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
        <NodeLabel label={data.label} selected={selected} />
      </EuiFlexGroup>
    );
  }
);

ServiceNode.displayName = 'ServiceNode';
