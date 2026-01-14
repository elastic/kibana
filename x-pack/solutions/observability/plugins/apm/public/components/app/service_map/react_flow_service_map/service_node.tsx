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
import {
  getServiceHealthStatusColor,
  ServiceHealthStatus,
} from '../../../../../common/service_health_status';
import type { AgentName, SpanType, SpanSubtype } from '../../../../../common/es_fields/apm';

export interface ServiceMapNodeData {
  id: string;
  label: string;
  agentName?: AgentName;
  spanType?: SpanType;
  spanSubtype?: SpanSubtype;
  serviceAnomalyStats?: {
    healthStatus?: ServiceHealthStatus;
  };
  isService: boolean;
}

// Custom Service Node component (circular)
export const ServiceNode = memo(
  ({ data, selected, sourcePosition, targetPosition }: NodeProps<Node<ServiceMapNodeData>>) => {
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
      if (status === ServiceHealthStatus.warning) return euiTheme.border.width.medium;
      if (status === ServiceHealthStatus.critical) return euiTheme.border.width.thick;
      return euiTheme.border.width.medium;
    }, [
      data.serviceAnomalyStats?.healthStatus,
      euiTheme.border.width.medium,
      euiTheme.border.width.thick,
    ]);

    const iconUrl = useMemo(() => {
      if (data.agentName) {
        return getAgentIcon(data.agentName, isDarkMode);
      }
      return null;
    }, [data.agentName, isDarkMode]);

    const CIRCLE_SIZE = 56;

    return (
      <EuiFlexGroup direction="column" alignItems="center" gutterSize="s" responsive={false}>
        {/* Circle container with handles inside for proper edge positioning */}
        <EuiFlexItem
          grow={false}
          css={css`
            position: relative;
            width: ${CIRCLE_SIZE}px;
            height: ${CIRCLE_SIZE}px;
          `}
        >
          <Handle
            type="target"
            position={targetPosition ?? Position.Left}
            css={css`
              visibility: hidden;
            `}
          />
          <div
            css={css`
              width: ${CIRCLE_SIZE}px;
              height: ${CIRCLE_SIZE}px;
              border-radius: 50%;
              border: ${borderWidth ?? euiTheme.border.width.medium} solid ${borderColor};
              background: ${euiTheme.colors.backgroundBasePlain};
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 2px rgba(0, 0, 0, 0.15);
              cursor: pointer;
            `}
          >
            {iconUrl && (
              <img
                src={iconUrl}
                alt={data.agentName}
                style={{ width: '60%', height: '60%', objectFit: 'contain' }}
              />
            )}
          </div>
          <Handle
            type="source"
            position={sourcePosition ?? Position.Right}
            css={css`
              visibility: hidden;
            `}
          />
        </EuiFlexItem>
        {/* Label */}
        <EuiFlexItem
          grow={false}
          css={css`
            font-size: ${euiTheme.size.s};
            color: ${selected ? euiTheme.colors.textPrimary : euiTheme.colors.textParagraph};
            font-family: ${euiTheme.font.family};
            max-width: 200px;
            text-align: center;
            overflow: hidden;
          `}
        >
          {data.label}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
);

ServiceNode.displayName = 'ServiceNode';
